const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('../src/utils/users')

const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT||3000;

const adminName = 'Admin';

const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
    console.log("Socket.IO connected!");

    socket.on('join', ({username, room}, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if(error){
            return callback(error);
        }
        socket.join(user.room);
        socket.emit('message', generateMessage(adminName,'Welcome!') );
        socket.broadcast.to(user.room).emit('message', generateMessage(adminName, `${user.username} has joined!`));
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback();
    });

    socket.on('isTyping',(callback) => {
        const user = getUser(socket.id);
        if(user)
        {
            user.isTyping = true;
            socket.broadcast.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    })

    socket.on('notTyping',(callback) => {
        const user = getUser(socket.id);
        if(user)
        {
            user.isTyping = false;
            socket.broadcast.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    })



    socket.on('messageSend', (message, callback) => {
        const user = getUser(socket.id);
        if(user){
            const filter = new Filter;
            if(filter.isProfane(message)){
                return callback("Profanity is not allowed!");
            }
            user.isTyping = false;
            socket.broadcast.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
            io.to(user.room).emit('message', generateMessage(user.username, message));
        }
        
        callback();
    });

    socket.on('shareLocation', (url, callback) => {
        const user = getUser(socket.id);
        if(user){
            const location = generateLocationMessage(user.username, url);
            io.to(user.room).emit('locationMessage', location);
        }
        callback();
    })

    socket.on('disconnect',() => {
        const user = removeUser(socket.id);
        if(user){
            io.to(user.room).emit('message', generateMessage(adminName,`${user.username} has left!`));
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }        
    })
})

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})