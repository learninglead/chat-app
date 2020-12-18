const socket = io();

// form Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $locationButton = document.querySelector('#share-location');
const $messages = document.querySelector('#messages');

//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Query String
const { username, room } = Qs.parse(location.search,{ ignoreQueryPrefix: true } )

const autoScroll = () => {
    //New message element
    const $newMessage = $messages.lastElementChild;

    //height of new message 
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    //visibal Height
    const visibalHeight = $messages.offsetHeight;

    //Height of offset container
    const containerHeight = $messages.scrollHeight;

    //How far I scrolled?
    const scrollOffset = $messages.scrollTop + visibalHeight;

    if(containerHeight-newMessageHeight <= scrollOffset){
        $messages.scrollTop = $messages.scrollHeight;
    }
}

socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message : message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
})

socket.on('locationMessage', (message) => {
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url, 
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
})

socket.on('roomData',({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html;
});


$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    $messageFormButton.setAttribute('disabled','disabled');
    let message = $messageFormInput.value;
    socket.emit('messageSend', message, (error) => {
        $messageFormButton.removeAttribute('disabled');
        if(error){
            return console.log(error);
        }
        console.log("Message Delivered!");
    });
    $messageFormInput.value = "";
    $messageFormInput.focus();
})

$locationButton.addEventListener('click',() => {
    if(!navigator.geolocation){
        return alert("Your broowser not support geo location!");
    }
    
    $locationButton.setAttribute('disabled','disabled');
    navigator.geolocation.getCurrentPosition((position) => {
        let url = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
        socket.emit('shareLocation', url, (error) => {
            $locationButton.removeAttribute('disabled');
            if(error){
                return console.log(error);
            }
            console.log("Location Shared!");
        });
    })
})

socket.emit('join', { username, room }, (error) => {
    if(error){
        alert(error);
        location.href = "/";
    }
});

$messageFormInput.addEventListener('input',() => {
    if($messageFormInput.value){
        socket.emit('isTyping');
        console.log($messageFormInput.value)
    } else {
        socket.emit('notTyping');
    }
    
})
