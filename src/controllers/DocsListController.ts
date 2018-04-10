import { Path, GET, POST, PUT, BodyParam, CtxParam, PathParam } from 'iwinter';
import Email from '../email';
import DocsName from '../models/DocsName';
import DocsInfo from '../models/DocsInfo';
import { userLoginAuth } from '../auth';
import { buildResponse } from '../utils';


@Path('/api/docsList', userLoginAuth)
class DocsListController {

    /**
     * 查询文档列表
     */
    @Path('/all')
    @GET
    async getDocsList(@CtxParam('ctx') ctx: any) {
        let { userId, admin } = ctx.session.userInfo;
        let docsList = [];
        if (userId) {
            docsList = await DocsInfo.find({});
            await Promise.all(docsList.map(async docs => {
                let docsName = await DocsName.find({ _id: docs.docsNameId });
                docs['docsName'] = docsName[0].name;
            }));
        }
        return buildResponse(null, docsList);
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

export default DocsListController;