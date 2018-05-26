import { Path, POST, BodyParam, CtxParam } from 'iwinter';
import * as fs from 'mz/fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as formidable from 'formidable';
import * as qiniu from 'qiniu';
import { buildResponse, genSalt } from '../utils';
import config from '../config';
const unzip = require('unzip2');
const copydir = require('copy-dir');

const { server: { host, port } } = config;
const pathToPublicFiles = path.join(__dirname, '../../', 'public', 'uploadfiles')

@Path('/api/upload')
class UploadController {

    @POST
    @Path('/')
    async uploadDoc(@BodyParam('formData') formData: any, @CtxParam('ctx') ctx: any) {
        // 文件将要上传到哪个文件夹下面
        let uploadfoldername = 'uploadfiles';
        let uploadfolderpath = path.join(__dirname, '../../public', uploadfoldername);
        // 使用第三方的 formidable 插件初始化一个 form 对象
        let form = new formidable.IncomingForm();
        form.uploadDir = path.join(__dirname, '../../', 'tmp');

        let result = await new Promise(function (resolve, reject) {
            form.parse(ctx.req, function (err, fields, files) {
                if (err) {
                    return console.log('formidable, form.parse err');
                }

                let item;
                // 计算 files 长度
                let length = 0;
                for (item in files) {
                    length++;
                }
                if (length === 0) {
                    return console.log('files no data');
                }

                for (item in files) {
                    let file = files[item];
                    // formidable 会将上传的文件存储为一个临时文件，现在获取这个文件的目录
                    let tempfilepath = file.path;
                    // 获取文件类型
                    let type = file.type;

                    // 获取文件名，并根据文件名获取扩展名
                    let filename = file.name;
                    let originFileName = filename;
                    let extname = filename.lastIndexOf('.') >= 0
                        ? filename.slice(filename.lastIndexOf('.') - filename.length)
                        : '';
                    // 文件名没有扩展名时候，则从文件类型中取扩展名
                    if (extname === '' && type.indexOf('/') >= 0) {
                        extname = '.' + type.split('/')[1];
                    }
                    // 将文件名重新赋值为一个随机数（避免文件重名）
                    filename = Math.random().toString().slice(2) + extname;

                    // 构建将要存储的文件的路径
                    let filenewpath = path.join(uploadfolderpath, filename);

                    // 将临时文件保存为正式的文件
                    fs.rename(tempfilepath, filenewpath, function (err) {
                        // 存储结果
                        let result = '';
                        console.log(tempfilepath);
                        console.log(filenewpath);

                        if (err) {
                            // 发生错误
                            console.log(err);
                            console.log('fs.rename err');
                            result = 'error|save error';
                        } else {
                            // 保存成功
                            console.log('fs.rename done');
                            const uploadFile = path.join(pathToPublicFiles, filename);
                            const docsDirName = genSalt(12);
                            const docsNameDir = path.resolve(pathToPublicFiles, '../', docsDirName);
                            const codsRealExt = extname;
                            const docsRealDir = path.join(docsNameDir, originFileName.slice(0, -codsRealExt.length));
                            //解压缩，生成访问路径
                            fs.mkdirSync(docsNameDir);

                            //生成访问路径
                            let docsLinkPath = `http://${host}:${port}/${docsDirName}/`;
                            let docsLink = docsLinkPath;
                            if (codsRealExt === '.zip') {
                                fs.createReadStream(uploadFile)
                                    .pipe(unzip.Extract({ path: docsNameDir }))
                                    .on('close', function () {
                                        copydir.sync(docsRealDir, docsNameDir);
                                        //将上传的zip 文件删除，将解压包删除                
                                        rimraf(docsRealDir, () => { });
                                    });
                                docsLink = `${docsLinkPath}index.html`;
                            } else {
                                fs.copyFileSync(uploadFile, `${docsNameDir}/${filename}`);
                                docsLink = `${docsLinkPath}${filename}`
                            }
                            fs.unlink(uploadFile, () => { });
                            resolve(buildResponse(null, { docsLink }));
                        }
                    });
                }
            });
        });
        return result;
    }
}

export default UploadController;