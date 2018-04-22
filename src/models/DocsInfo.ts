import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

let VersionSchema = new Schema({
    version: String,
    filename: String,
    link: String,
    createInstance: Date
});

let DocsTypeSchema = new Schema({
    docsTypeId: String,
    docsTypeName: String,
    versions: [VersionSchema]
});


let docsInfoSchema = new Schema({
    docsNameId: String,
    docsName: String,
    docsTypes: [DocsTypeSchema],
    createInstance: Date,
    userId: String
});

export default mongoose.model('DocsInfo', docsInfoSchema);