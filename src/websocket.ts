import * as Websocket from 'ws'
import * as mongoose from 'mongoose';

import { Request, Response } from 'express';

import ConversationModel from './models/conversationModel';
import MessageModel from './models/messageModel';

let { WebSocketServer, OPEN } = Websocket

class WSServer {
  private wss
  private rooms
  private clientList//danh sach nguoi dung ket noi
  private serverList//danh sach nguoi dung ho tro
  private adminRooms
  private port
  private room_id
  private user_id
  private page_id

  constructor(port) {
    this.port = port
    this.wss = new WebSocketServer({ port })
    this.rooms = new Map()
    this.adminRooms = new Map()
  }
  start() {
    this.wss.on('listening', () => {
      console.log(`WebSocket server started on port ${this.port}`)
    })
    this.wss.on('connection', this.handleConnection.bind(this))
  }
  handleConnection(ws) {
    ws.on('message', async (message) => {
      try {
        const dataS = JSON.parse(message)
        console.log(`Received message: ${message}`)
        
        let {type, data, userId, last_msg, pageId, roomId } = dataS
        this.room_id = roomId
        this.user_id = userId
        this.page_id = pageId

        //check room_id
        //if(!mongoose.Types.ObjectId.isValid(room_id)){
          //không phải nhấn nút Bắt Đầu Chat
        if(type !== 'start_osiner') {
          const conversationMd = await ConversationModel.findOne({
            page_id: this.page_id,
            creator_id: this.user_id
          }).exec()
          
          if(conversationMd !== null) {
            this.room_id = conversationMd.id
          }
  
          if(this.room_id) {
            const roomList = this.rooms.get(this.room_id)
            console.log(`room list: ${roomList}`)
          } else {
            console.log('this.rooms', this.rooms.size)
          }
        }
        
        console.log('typeeee >>>>>>>', type)
        switch (type) {
          /**
           * Hien thi danh sach trong panel
           */
          case 'list_room' : {
            let conversations = await ConversationModel.find({
              page_id    : this.page_id
            }).exec()
            conversations = conversations.map((item)  => {
              item = item.toObject()
              return {...item, unread: 1, unseenMsgs: 3, name: 'Danh Sinh', created_at: item.created_at, id: item._id}
            })
            if(!this.adminRooms.has(this.page_id)) {
              this.adminRooms.set(this.page_id, new Set())
            }
            //join phong
            
            let adminRoom = this.adminRooms.get(this.page_id)
            
            adminRoom.add(ws)
            ws.send(JSON.stringify({ type: 'joined_AdminRoom', roomId }));
            ws.send(JSON.stringify({type, data: conversations}))
            //tao phong neu chua co
            
            //sendToAdminRooms

          }
          break
          /**
           * Tạo phòng create_room
           * vào phòng join_room
           */
          case 'start_osiner' : {
            //tạo conversation
            const conversationMd = await ConversationModel.create({
              creator_id : this.user_id,
              page_id    : this.page_id
            })
            //create room 
            this.createRoom(ws, conversationMd.id)
            //vao phong
            this.joinRoom(ws, conversationMd.id)
            //hien thi danh sach ng dung 
            
            //gui lai room_id
            ws.send(JSON.stringify({
              type: 'room_id_osiner',
              data: {
                room_id : conversationMd.id
              }
            }))
          }
          break
          case 'typing' : {
            this.sendToRoom(ws, this.room_id, {type: 'typing'})
          }
          break
          /**Ấn f5 */
          case 'first_osiner' : {
            //kiem tra phong
            let conversationMd = await ConversationModel.findOne({
                page_id: this.page_id,
                creator_id: this.user_id
              }).exec()
            if(conversationMd !== null) {
              //Gửi trả lại để hiển thị danh sách tin nhắn
              let messages = await MessageModel.find({ conversation_id: conversationMd.id}).sort({created_at: 1}).exec()
              ws.send(JSON.stringify({
                type: 'messages',
                data: messages
              }))
              ////////////////TEST
              this.createRoom(ws, this.room_id)
              ////////////////
              //đã có tin nhắn
              this.joinRoom(ws, this.room_id)
              //gửi lại id phòng
              ws.send(JSON.stringify({
                type: 'room_id_osiner',
                data: {
                  room_id : this.room_id
                }
              }))
            }else {
              //gửi lại nút bắt đầu
              ws.send(JSON.stringify({
                type: 'start_btn_osiner',
              }))
            }
          }
          break
          case 'open_room' : {
            //vao phong va lay danh sach
            this.send(ws, 'open_room', {  data: [] })//gui lai danh sach
            this.joinRoom(ws, this.room_id)
            console.log('this.rooms', this.room_id, this.rooms.size);
            
          }
          break
          case 'leaveRoom' : {
            //this.leaveRoom(ws, this.room_id)
          }
          break
          case 'joinRoom' : {
            this.joinRoom(ws, this.room_id)
          }
          break
          case 'add_message' : {
            // await MessageModel.create({
            //   conversation_id: room_id,
            //   message: data.text,
            //   user_id,
            // })
            
            // cap nhat conversationm user_ids last_msg
            await ConversationModel.findByIdAndUpdate(this.room_id, {
              last_msg: data.text
            }).exec()
            
            //gửi tin nhắn đến tất cả mọi ng trong phòng
            this.sendToRoom(ws, this.room_id, {type: 'added_message', data: data.text})
            // //Sap xep lai room moi
            // this.sendToRoom(ws, this.room_id, { type: 'updated_list_room', data: {
            //   id: this.room_id,
            //   last_msg: data.text
            // }})
            this.sendToAdminRoom(ws, this.page_id, {type: 'updated_list_admin', data: {
              roomId: this.room_id,
              pageId: this.page_id,
              lastMsg: data.text
            }})
          }
          break
        }
      } catch (error) {
        this.send(ws, 'error', { message: error })
      }
    });

    ws.on('close', () => {
      this.removeClientFromRooms(ws);
    })
  }
  sendMessage(ws, roomId, content) {
    const message = JSON.stringify({ type: 'message', content });
    this.sendToRoom(ws, roomId, message)
  }
  send(ws, type, data) {
    ws.send(JSON.stringify({type, ...data}))
  }
  createRoom(ws, roomId) {
    //const roomId = this.generateRoomId();
    this.rooms.set(roomId, new Set());
    //gui ra danh sach
    //ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
  }

  // Trong phương thức handleConnection
  joinRoom(ws, roomId) {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);
      room.add(ws);
      ws.send(JSON.stringify({ type: 'joined_room', roomId }));
  
      // Gửi danh sách tin nhắn cũ trong phòng
      room.forEach((client) => {
        if (client !== ws) {// thong bao da co ng vao phong
          client.send(JSON.stringify({ type: 'message', content: 'A new user has joined the room.' }));
        }
      });
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid room ID' }));
    }
  }
  joinListRoom(ws, pageId) {

  }
  sendToAdminRoom(ws, roomId, message) {
    console.log(
      'sendToAdminRoom',
      roomId,
      this.adminRooms.size
    );
    
    if (this.adminRooms.has(roomId)) {
      const room = this.adminRooms.get(roomId);
      
      room.forEach((client) => {
        client.send(JSON.stringify(message));
      });

    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid room ID' }));
    }
  }
  sendToRoom(ws, roomId, message) {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);
      
      room.forEach((client) => {
        client.send(JSON.stringify(message));
      });

    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid room ID' }));
    }
  }
  leaveRoom(ws, roomId) {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);
      room.delete(ws);
      ws.send(JSON.stringify({ type: 'roomLeft', roomId }));
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid room ID' }));
    }
  }

  removeClientFromRooms(ws) {
    this.rooms.forEach((room) => {
      if (room.has(ws)) {
        room.delete(ws);
      }
    });
  }

  generateRoomId() {
    return Math.random().toString(36).substr(2, 8);
  }
}
export default WSServer