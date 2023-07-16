import * as Websocket from 'ws'
import * as mongoose from 'mongoose';

import { Request, Response } from 'express';

import ConversationModel from './models/conversationModel';
import MessageModel from './models/messageModel';
import { kMaxLength } from 'buffer';

let { WebSocketServer, OPEN } = Websocket

class WSServer {

  private readonly port: number
  private server: any
  private rooms
  private clients = new Set()
  private socket
  private room_id
  private user_id
  private page_id

  constructor(port: number) {
    this.port = port
    this.server = new WebSocketServer({ port: this.port })
    this.rooms = new Map();
  }
  isWebSocketInRoom(room, ws) {
    const clients = this.rooms[room] || [];
    return clients.includes(ws);
  }
  sendToRoom(room, message, socket = null) {
    const clients = this.rooms.get(room);
    if(socket != null) {
      
      if(clients.has(socket)) {
        clients.delete(socket)
      }
    }
    clients.forEach((item) => {
      item.send(JSON.stringify(message));
    });
  }
  joinToRoom(room_id, socket, cb = null) {
    if(!this.rooms.has(room_id)) {
      this.rooms.set(room_id, new Set())
    }
    
    let room = this.rooms.get(room_id)
    room.add(socket)
    console.log('joinToRoom', this.rooms.size, room.size);
    
    if(cb !== null) cb()
  }
  async createRoom(page_id, user_id, cb) {
    let conversationMd = await ConversationModel.findOne({
      page_id: page_id,
      creator_id: user_id
    }).exec()
    if(conversationMd === null) {
      conversationMd = await ConversationModel.create({
        creator_id : user_id,
        page_id    : page_id
      })
    }else {
      cb(conversationMd)
    }
  }
  start(): void {
    this.server.on('listening', () => {
      console.log(`WebSocket server started on port ${this.port}`)
    })

    this.server.on('connection', async (socket: any) => {
      this.socket = socket
      
      socket.on('message', async (message:string) => {
        console.log(`Received message: ${message}`)
        const dataS = JSON.parse(message)
        let {type, data, user_id, last_msg, page_id, room_id } = dataS
        this.room_id = room_id
        this.user_id = user_id
        this.page_id = page_id
        //check room_id
          //if(!mongoose.Types.ObjectId.isValid(room_id)){
          let conversationMd = await ConversationModel.findOne({
            page_id: page_id,
            creator_id: user_id
          }).exec()
          if(conversationMd !== null) {
            room_id = conversationMd.id
          }
        switch (type) {
          case 'start_osiner' : {
            //tạo conversation
            conversationMd = await ConversationModel.create({
              creator_id : user_id,
              page_id    : page_id
            })
            this.socket.send(JSON.stringify({
              type: 'room_id_osiner',
              data: {
                room_id : conversationMd.id
              }
            }))
          }
          break
          case 'first_osiner' : {
            //kiem tra phong
            let conversationMd = await ConversationModel.findOne({
                page_id: page_id,
                creator_id: user_id
              }).exec()
            if(conversationMd !== null) {
              //Gửi trả lại để hiển thị danh sách tin nhắn
              let messages = await MessageModel.find({ conversation_id: conversationMd.id}).sort({created_at: 1}).exec()
            
              //đã có tin nhắnyarn 
              this.joinToRoom(conversationMd.id, this.socket, () => {
                //mới gửi những ng đang trong phong
                this.sendToRoom(conversationMd.id, {
                  type: 'messages', data: messages
                })
              })
              //gửi lại id phòng
              this.socket.send(JSON.stringify({
                type: 'room_id_osiner',
                data: {
                  room_id : conversationMd.id
                }
              }))
            }else {
              //gửi lại nút bắt đầu
              this.socket.send(JSON.stringify({
                type: 'start_btn_osiner',
              }))
            }
          }
          break
          case 'open_room' : 
          case 'join_room' : {
            console.log('open_room join_room');
            
            let messages = await MessageModel.find({ conversation_id: room_id}).sort({created_at: 1}).exec()
            this.joinToRoom(room_id, this.socket, () => {
              //mới gửi những ng đang trong phong
              this.socket.send(JSON.stringify({
                type: 'list_message', data: messages
              }))
            })
          }
          break
          case 'list_room' : {
            let conversations = await ConversationModel.find({
              page_id    : page_id
            }).exec()
            conversations = conversations.map((item)  => {
              item = item.toObject()
              return {...item, unread: 1, unseenMsgs: 3, name: 'Danh Sinh', created_at: item.created_at, id: item._id}
            })
            this.socket.send(JSON.stringify({type, data: conversations}))
          }
          break
          case 'leave_room' : {
            //rời phòng
            if (this.rooms[room_id]) {
              this.rooms[room_id] = this.rooms[room_id].filter((client) => client !== socket);
            }
          }
          break
          case 'add_message' : {
            
          console.log('add_message in rooms size', this.rooms.size)
            // cap nhat conversationm user_ids last_msg
            await ConversationModel.findByIdAndUpdate(room_id, {
              last_msg: data.text
            }).exec()
            //gửi tin nhắn đến tất cả mọi ng trong phòng
            this.sendToRoom(room_id, {type: 'add_message', data: data.text}, this.socket);
            //hien thi update

            this.sendToRoom(room_id, { type: 'update_list_room', data: {
              id: room_id,
              last_msg: data.text
            }})
          }
          break
          case 'typing_off' : {
            //gui thong tin ca nhan
            this.sendToRoom(room_id, { type: 'typing_off', data: false})
          }
          break
          case 'typing_on' : {
            this.sendToRoom(room_id, { type: 'typing_on', data: true})
          }
          break
        }
      })

      
      socket.on('close', () => {
        //remove the socket ID from all chat rooms
        const room = this.rooms.get(this.room_id);
        console.log('remove socket', room, this.room_id);
        
        //là chưa join vào nên delete nên bị lỗi
        //room.delete(this.socket);
  
        // if (room.size === 0) {
        //   this.rooms.delete(this.room_id);
        // }
      })

      socket.on('error', (error: Error) => {
        console.error('WebSocket error:', error)
      })
    })
  }

  stop(): void {
    this.server.close(() => {
      console.log('WebSocket server stopped')
    })
  }
}
export default WSServer