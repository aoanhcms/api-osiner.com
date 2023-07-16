import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  message: {
    type: String,
  },
  conversation_id: {
    type: String,
  },
  user_id: {
    type: String,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updatedAt'
  }
});

const Conversation = mongoose.model('ds_messages', conversationSchema);
export default Conversation