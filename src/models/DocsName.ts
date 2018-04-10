import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

const docsNameSchema = new Schema({
    name: String,
    createInstance: Date
});

export default mongoose.model('DocsName', docsNameSchema);