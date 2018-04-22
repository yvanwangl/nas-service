import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

const docsTypeSchema = new Schema({
    name: String,
    createInstance: Date
});

export default mongoose.model('DocsType', docsTypeSchema);