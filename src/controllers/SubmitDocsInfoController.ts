import { Path, GET, POST, PUT, BodyParam, CtxParam, PathParam } from 'iwinter';
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import Email from '../email';
import DocsName from '../models/DocsName';
import DocsType from '../models/DocsType';
import DocsInfo from '../models/DocsInfo';
import { userAdminLoginAuth } from '../auth';
import { buildResponse } from '../utils';
import config from '../config';
const unzip = require('unzip2');
const copydir = require('copy-dir');

const { server: { host, port } } = config;
const pathToPublicFiles = path.join(__dirname, '../../', 'public', 'uploadfiles')

@Path('/api/submitDocsInfo', userAdminLoginAuth)
class SubmitDocsInfoController {

    /**
     * 查询文档名称列表
     */
    @Path('/docsNameList')
    @GET
    async getDocsNameList(@CtxParam('ctx') ctx: any) {
        let { userId, admin } = ctx.session.userInfo;
        let docsNamesList = [];
        if (userId && admin) {
            docsNamesList = await DocsName.find({});
        }
        return buildResponse(null, docsNamesList);
    }

    /**
     * 查询文档类型列表
     */
    @Path('/docsTypeList')
    @GET
    async getDocsTypeList(@CtxParam('ctx') ctx: any) {
        let { userId, admin } = ctx.session.userInfo;
        let docsTypeList = [];
        if (userId && admin) {
            docsTypeList = await DocsType.find({});
        }
        return buildResponse(null, docsTypeList);
    }

    /**
     * 新增文档名称
     */
    @POST
    @Path('/addDocsNameOrType')
    async submitInfo(@CtxParam('ctx') ctx: any, @BodyParam('docsNameInfo') docsNameInfo: any) {

        //设置创建人 和 创建时间
        Object.assign(docsNameInfo, {
            createInstance: new Date()
        }); 
        let newDocsNameOrType;
        if(docsNameInfo.addType === 'docsType'){
            newDocsNameOrType = new DocsType(docsNameInfo);
        }else {
            newDocsNameOrType = new DocsName(docsNameInfo);
        }
        let result = await newDocsNameOrType.save();
        
        return buildResponse(null, result);
    }

    /**
     * 保存文档信息
     */
    @POST
    @Path('/addDocsInfo')
    async addDocsInfo(@CtxParam('ctx') ctx: any, @BodyParam('docsInfo') docsInfo: any) {

        const uploadFile = path.join(pathToPublicFiles, docsInfo.filename);
        const docsNameDir = path.resolve(pathToPublicFiles, '../', docsInfo.docsNameId);
        const docsTypeDir = path.resolve(docsNameDir, docsInfo.docsTypeId);
        const docsVersionDir = path.resolve(docsTypeDir, docsInfo.docsVersion);
        const docsRealName = docsInfo.upload[0].name;
        const codsRealExt = path.extname(docsRealName);
        const docsRealDir = path.join(docsVersionDir, docsRealName.slice(0, -codsRealExt.length));
        //解压缩，生成访问路径
        try {
            fs.readdirSync(docsNameDir);
        } catch{
            fs.mkdirSync(docsNameDir);
        }

        try {
            fs.readdirSync(docsTypeDir);
        }catch {
            fs.mkdirSync(docsTypeDir);
        }

        // 如果该版本已经存在则直接报错
        try {
            fs.mkdirSync(docsVersionDir);
        } catch {
            return buildResponse(`版本 ${docsInfo.docsVersion} 已经存在 😅`);
        }
        //生成访问路径
        let docsLinkPath = `http://${host}:${port}/${docsInfo.docsNameId}/${docsInfo.docsTypeId}/${docsInfo.docsVersion}/`;
        let docsLink = docsLinkPath;
        if(codsRealExt === '.zip'){
            fs.createReadStream(uploadFile)
            .pipe(unzip.Extract({ path: docsVersionDir }))
            .on('close', function () {
                copydir.sync(docsRealDir, docsVersionDir);
                //将上传的zip 文件删除，将解压包删除                
                rimraf(docsRealDir, ()=> {});
            });
            docsLink = `${docsLinkPath}index.html`;            
        }else{
            fs.copyFileSync(uploadFile, `${docsVersionDir}/${docsInfo.filename}`);
            docsLink = `${docsLinkPath}${docsInfo.filename}`
        }
        fs.unlink(uploadFile, () => {}); 


        //查找是否已经有该文档
        let docsInfoList = await DocsInfo.find({ docsNameId: docsInfo.docsNameId });
        //没有则新建
        if (docsInfoList.length == 0) {

            let newDocsInfo = new DocsInfo({
                ...docsInfo,
                createInstance: new Date(),
                docsTypes: [
                    {
                        docsTypeId: docsInfo.docsTypeId,
                        versions: [{
                            version: docsInfo.docsVersion,
                            filename: docsInfo.filename,
                            link: docsLink,
                            createInstance: new Date()
                        }]
                    }
                ]
            });
            let result = await newDocsInfo.save();
            return buildResponse(null, result);
        }
        let targetDocsInfo = docsInfoList[0];
        let targetDocsTypes = targetDocsInfo.docsTypes.filter(docsType=> docsType.docsTypeId === docsInfo.docsTypeId);
        // 如果 '交互' 的文档类型存在，则 直接修改 versions
        if(targetDocsTypes.length === 1){
            let preVersions = targetDocsTypes[0].versions;
            if(preVersions.length === 5) {
                let lastVersion = preVersions.pop();
                //删除过期的版本，版本只保留最近 5 个
                rimraf(path.resolve(docsTypeDir, lastVersion.version), ()=>{});
            }
            targetDocsTypes[0].versions = [
                {
                    version: docsInfo.docsVersion,
                    filename: docsInfo.filename,
                    link: docsLink,
                    createInstance: new Date()
                },
                ...preVersions     
            ];
        } else {
            // 如果 ‘交互’ 的文档类型不存在，则增加
            targetDocsInfo.docsTypes = [
                ...targetDocsInfo.docsTypes,
                {
                    docsTypeId: docsInfo.docsTypeId,
                    versions: [{
                        version: docsInfo.docsVersion,
                        filename: docsInfo.filename,
                        link: docsLink,
                        createInstance: new Date()
                    }]
                }
            ];
        }
        let otherresult = await DocsInfo.findByIdAndUpdate(targetDocsInfo._id, {
            $set: {
                docsTypes: targetDocsInfo.docsTypes
            }
        }, { new: true });
       
        return buildResponse(null, otherresult);
    }



    /**
     * 发送邮件
     * @param target 收件箱
     * @param subject 邮件主题
     * @param content 邮件内容
     */
    sendEmail(target: string, subject: string, content: string) {
        //收件箱存在则发送
        if (target) {
            let email = new Email();
            email.sendMail({
                target,
                subject,
                html: content
            });
        }
    }

}

export default SubmitDocsInfoController;