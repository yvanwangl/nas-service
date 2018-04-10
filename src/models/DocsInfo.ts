import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

let VersionSchema = new Schema({
    version: String,
    filename: String,
    link: String,
    createInstance: Date
});


let docsInfoSchema = new Schema({
    docsNameId: String,
    docsName: String,
    versions: [VersionSchema],
    createInstance: Date,
    userId: String
});

export default mongoose.model('DocsInfo', docsInfoSchema);