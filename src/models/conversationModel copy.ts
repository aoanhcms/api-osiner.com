import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  first_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  gender: {
    type: String,
  },
  username: {
    type: String 
  },
  email: {
    type: String
  },
  plan_id: {
    type: String,
  },
  dob: {
    type: String,
  },
  phone: {
    type: String
  },
  status: {
    type: Boolean
  },
  password: {
    type: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
});

const Conversation = mongoose.model('ds_users', conversationSchema);
export default Conversation