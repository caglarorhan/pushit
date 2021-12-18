if(!window.hasOwnProperty('WDC')) window.WDC = {};
if(!WDC.hasOwnProperty('push')) WDC.push={};
if(!WDC.hasOwnProperty('serviceworker')) WDC.serviceworker={};
if(!WDC.hasOwnProperty('helpers')) WDC.helpers={};
if(!WDC.hasOwnProperty('logger')) WDC.logger={"data":[]};
let ccode = 1234;
if(!WDC.hasOwnProperty('ccode')) WDC.ccode = ccode ?? '0000';
// if(!WDC.hasOwnProperty('useragent') && UAParser) WDC.useragent = new UAParser().getResult();
if(!WDC.hasOwnProperty('user')) WDC.user = {};
if(!WDC.hasOwnProperty('configurl')) WDC.configurl = 'config.json';//https://push.wdc.center/push_config.php?ccode='+WDC.ccode; // config.json
if(!WDC.hasOwnProperty('datatypeandsendmethod')) WDC.datatypeandsendmethod = {method:'GET',datatype:'IMAGE'} //{method:'POST',datatype:'FORMDATA'}; // {method:'GET',datatype:'URL'} // {method:'GET',datatype:'FORMDATA'}
if(!WDC.hasOwnProperty('pkey')) WDC.pkey = '000';
if(!WDC.user.hasOwnProperty('email')) WDC.user.email ='';

// window.addEventListener('beforeinstallprompt', (e) => {
//     e.preventDefault();
//     let deferredPrompt = e;
//     document.querySelector('#addBtn').addEventListener('click', e=>{
//         deferredPrompt.prompt();
//         deferredPrompt.userChoice.then(choiceResult=>{
//             console.log(choiceResult.outcome);
//             deferredPrompt = null;
//         });
//     });
// });
// TODO browser turune gore push registration ve push notification gonderme ozellestirme islemleri
// Desktop: Chrome, Safari, Edge, Firefox sirali kullanim yuzdeleri buyukten kucuge dogru
// Mobile: Chrome, Safari, Samsung, Opera sirali kullanim yuzdeleri buyukten kucuge dogru
// Tablet: Safari, Chrome, Android, Samsung, Opera, Firefox sirali kullanim yuzdeleri buyukten kucuge dogru
//----------------------------------------------------------------------------------------------/
WDC.push.init = ()=>{
    WDC.push.getConfigJson()
        .then(jsonData=>{
            WDC.serviceworker.register(jsonData.SW_JS_PATH, {scope: '/'});
            WDC.push.permissionRequestTriggerEventAdder(jsonData.SW_PUSH_NOTIFICATION_SUBSCRIPTION_TRIGGER_IDS);
            if(jsonData.SW_PUSH_NOTIFICATION_REQUEST_ONLOAD){
                WDC.push.subscribe(jsonData);
            }    })
        .catch(error=>{
            WDC.logger.log({"source":"init", "type":"error", "logDateTime":new Date(), "log":error})
        })
}
//==========================================================================================/
WDC.push.permissionRequestTriggerEventAdder = (triggerIdsArray=[])=>{
    console.log('triggers added');
    if(triggerIdsArray.length){
        triggerIdsArray.forEach(triggerId=>{
            document.getElementById(triggerId).addEventListener('click',()=>{
                console.log('target trigger clicked');
                WDC.push.permissionRequestDialog();
            })
        })
    }
}
//-------------------------------------------------------------------------------------------
WDC.push.permissionRequestDialog=()=>{
    WDC.push.getConfigJson().then(jsonData=>{
        let askPermission = confirm('Push notification permission request');
        if(askPermission){
            WDC.push.subscribe(jsonData);
        }
    })
}
//--------------------------------------------------------------------------------------------
WDC.push.registryOptions = (publicKey)=>{
    return {
        userVisibleOnly:true,
        applicationServerKey:WDC.helpers.urlB64ToUint8Array(publicKey)
    }
}

//-------------------------------------------------------------------------------------------
WDC.push.getConfigJson =()=>{
    return new Promise((resolve,reject)=>{
        let configJsonCall = fetch(WDC.configurl)
            .then(response=> resolve(response.json()))
            .catch(error=>{
                WDC.logger.log({"source":"getConfigJson", "type":"error", "logDateTime":new Date(), "log":error})
                reject(error);
            })
        if(('serviceWorker' in navigator && 'PushManager' in window)){

        }else{
            WDC.logger.log({"source":"serviceWorkerCheck", "type":"error", "logDateTime":new Date(), "log":"Serviceworker and/or PushManager is not supported by this browser!"})
        }
    })
}
//-------------------------------------------------------------------------
WDC.serviceworker.register=(scriptURL)=>{
    if ('serviceWorker' in navigator) {
        console.log(`Target sw file: ${scriptURL}`);
        navigator.serviceWorker.register(`./${scriptURL}`, {scope: './'})
            .then((reg) => {
                // registration worked
                console.log('Registration succeeded. Scope is ' + reg.scope);
            }).catch((error) => {
            // registration failed
            console.log('Registration failed with ' + error);
        });
    }
}
//------------------------------------------------------------------------
WDC.push.unsubscribe=()=>{
    navigator.serviceWorker.ready
        .then(reg=>{
            reg.pushManager.permissionState(REGISTRY_OPTIONS)
                .then(perm=>{
                    switch(perm){
                        case "prompt":
                            //console.log('Push permission is on prompt stage!');
                            break;
                        case "granted":
                            //console.log(`Push permisson is `,perm);//unsubscribe
                            navigator.serviceWorker.ready.then(function(reg) {
                                reg.pushManager.getSubscription().then(function(subscription) {
                                    subscription.unsubscribe().then(function(successful) {
                                        // You've successfully unsubscribed
                                    }).catch(function(e) {
                                        // Unsubscription failed
                                    })
                                })
                            });

                            break;
                        case "denied":
                            //console.log('Push permission is denied by user!');
                            break;
                    }
                })
        })
}
//---------------------------------------------------------------------------------------------------------------
WDC.push.subscribe=(jsonData)=>{
    if (!('serviceWorker' in navigator)) {console.log('Serviceworker is not supported in this browser!'); return;}
    if (!('PushManager' in window)) {console.log('PushManager is not supported in this browser!');return;}
    navigator.serviceWorker.ready
        .then(swRegistration=>{
            swRegistration.pushManager.getSubscription().then(pushRegistration=>{
                if(!pushRegistration){
                    //alert('Please give permisson for push notifications.');
                    swRegistration.pushManager.subscribe(WDC.push.registryOptions(jsonData.PUBLIC_KEY))
                        .then(pushRegistration=>{
                            console.log('PUSH REGISTRATION OBJ:'+JSON.stringify(pushRegistration));

                            WDC.push.sendPushSubscriptionDataToServer(pushRegistration, jsonData.WDC_PUSH_SERVER_URL).then(response=>{
                                console.log('Data pushed to the WDC push registry service.');
                                console.log(`Response: ${response}`);
                            })
                        })
                        .catch(err=>{
                            if(Notification.permission==='denied'){
                                console.warn('Permisson for push notifications was denied!')
                            }else{
                                console.log(`Unable to subscribe to push notifications`, err)
                            }
                        })
                }else{
                    //console.log(JSON.stringify(pushRegistration));
                    WDC.push.sendPushSubscriptionDataToServer(pushRegistration, jsonData.WDC_PUSH_SERVER_URL).then(response=>{console.log('Data pushed to the WDC push registry service.')})
                }

            })
        })
}
//---------------------------------------------------------------------------------------
WDC.push.sendPushSubscriptionDataToServer= async(subs={}, url)=>{
    let pushData  = `ccode=${WDC.ccode}&pkey=${WDC.pkey}&email=${WDC.user.email}&subs=${encodeURIComponent(JSON.stringify(subs))}`;
    switch(WDC.datatypeandsendmethod.method){
        case "POST":
            switch (WDC.datatypeandsendmethod.datatype){
                case "FORMDATA":

                    let push2DBServer = await fetch(`${url}`,
                        {
                            method: "POST",
                            mode: 'cors',
                            headers: {
                                'Accept': '*/*',
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Cache-Control': 'no-cache'
                            },
                            body: pushData
                        }).then(res=>{console.log(`Response:`,res)});
                    break;
            }
            break;
        case "GET":
            switch(WDC.datatypeandsendmethod.datatype){
                case "IMAGE":
                    let pushImage = document.createElement('img');
                    pushImage.src=`${url}?${pushData}`;
                    pushImage.style.cssText=`height:0; width:0; display:none`;
                    document.body.append(pushImage);
                    break;
                case "FORMDATA":
                    let push2DBServer = await fetch(`${url}`,
                        {
                            method: "GET",
                            mode: 'cors',
                            headers: {
                                'Accept': '*/*',
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Cache-Control': 'no-cache'
                            },
                            body: pushData
                        }).then(res=>{console.log(`Response:`,res)});
                    break;
                default:
                    break;
            }

            break;
        default:
            break;
    }
}

WDC.push.permissionStatus = ()=>{
    navigator.serviceWorker.ready
        .then(swRegistration=>{
            swRegistration.pushManager.permissionState(REGISTRY_OPTIONS).then(perm=>{
                switch(perm){
                    case "prompt":
                        //console.log('Push permission is on prompt!');
                        break;
                    case "granted":
                        // console.log(`Push permisson is `,perm);
                        break;
                    case "denied":
                        //console.log('Push permission is denied!');
                        break;
                }
            })
        })
}

WDC.helpers.newBtoa = (rawString='')=>{
    return btoa(String.fromCharCode.apply(null, new Uint8Array(rawString)));
}

WDC.helpers.urlB64ToUint8Array =(base64String)=>{
    console.log(base64String)
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

WDC.logger.log = (log={"source":"unknown", "type":"general", "logDateTime":new Date(), "log":"log notes"})=>{
    WDC.logger.data.push(log);
}


WDC.push.init();


