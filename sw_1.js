self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    const title = 'WDC Deneme';
    const options = {
        body: `${event.data.text()}`,
        icon: 'images/rubber-duck_64.png',
        badge: 'images/rubber-duck_32.png',
        tag:'WDC deneme tagi',
        data:'',
        image:'',
        actions:[{action:'', title:'', icon:''},{action:'', title:'', icon:''}],
        requireInteraction:true
    };
    self.registration.showNotification(title, options).then(function(event){console.log('not gosterildi')} );
    const notificationPromise = self.registration.showNotification(title, options);
    event.waitUntil(notificationPromise);

});


self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
});
