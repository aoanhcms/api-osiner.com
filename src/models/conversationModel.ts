import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  user_ids: {
    type: Array,
  },
  page_id: {
    type: String,
  },
  last_msg: {
    type: String,
  },
  unread: {
    type: String,
  },
  creator_id: {
    type: String,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
});

const Conversation = mongoose.model('ds_conversations', conversationSchema);
export default Conversation