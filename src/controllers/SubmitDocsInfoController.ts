import { Path, GET, POST, PUT, BodyParam, CtxParam, PathParam } from 'iwinter';
import * as fs from 'fs';
import * as path from 'path';
import Email from '../email';
import DocsName from '../models/DocsName';
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
     * 新增文档名称
     */
    @POST
    @Path('/addDocsName')
    async submitInfo(@CtxParam('ctx') ctx: any, @BodyParam('docsNameInfo') docsNameInfo: any) {

        //设置创建人 和 创建时间
        Object.assign(docsNameInfo, {
            createInstance: new Date()
        });
        let newDocsName = new DocsName(docsNameInfo);
        let result = await newDocsName.save();
        return buildResponse(null, result);
    }

    /**
     * 保存文档信息
     */
    @POST
    @Path('/addDocsInfo')
    async addDocsInfo(@CtxParam('ctx') ctx: any, @BodyParam('docsInfo') docsInfo: any) {

        //查找是否已经有该文档
        let docsInfoList = await DocsInfo.find({ docsNameId: docsInfo.docsNameId });
        const docsNameDir = path.resolve(pathToPublicFiles, '../', docsInfo.docsNameId);
        const docsVersionDir = path.join(pathToPublicFiles, '../', docsInfo.docsNameId, docsInfo.docsVersion);
        const docsRealName = docsInfo.upload[0].name;
        const codsRealExt = path.extname(docsRealName);
        const docsRealDir = path.join(docsVersionDir, docsRealName.slice(0, -codsRealExt.length));
        //解压缩，生成访问路径
        try {
            fs.readdirSync(docsNameDir);
        } catch{
            fs.mkdirSync(docsNameDir);
        }

        fs.mkdirSync(docsVersionDir);
        //生成访问路径
        let docsLink = `http://${host}:${port}/${docsInfo.docsNameId}/${docsInfo.docsVersion}/index.html`;
        fs.createReadStream(path.join(pathToPublicFiles, docsInfo.filename))
            .pipe(unzip.Extract({ path: docsVersionDir }))
            .on('close', function () {
                //将上传的文件夹删除, 将
                copydir.sync(docsRealDir, docsVersionDir);
                //fs.rmdirSync(docsRealDir);
            });


        //没有则新建
        if (docsInfoList.length == 0) {

            let newDocsInfo = new DocsInfo({
                ...docsInfo,
                versions: [{
                    version: docsInfo.docsVersion,
                    filename: docsInfo.filename,
                    link: docsLink,
                    createInstance: new Date()
                }]
            });
            let result = await newDocsInfo.save();
            return buildResponse(null, result);
        }
        let targetDocsInfo = docsInfoList[0];
        let otherresult = await DocsInfo.findByIdAndUpdate(targetDocsInfo._id, {
            $set: {
                versions: [
                    {
                        version: docsInfo.docsVersion,
                        filename: docsInfo.filename,
                        link: docsLink,
                        createInstance: new Date()
                    },
                    ...targetDocsInfo.versions
                ]
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