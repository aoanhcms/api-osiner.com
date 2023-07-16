import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

export const ContactSchema = new Schema({
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
});