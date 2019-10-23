#!/usr/bin/env node

/**
 * @file 喜马拉雅音频下载器
 * @author zeakhold
 * @description 本工具用于下载ximalaya.com.上的音频，支持以下三种形式的URL：
 *      1. https://www.ximalaya.com/ertong/12891461/                下载整个专辑
 *      2. https://www.ximalaya.com/ertong/12891461/p2/             下载第二页
 *      3. https://www.ximalaya.com/ertong/12891461/211393643       下载单个音频
 */

const fs = require('fs')
const program = require('commander')
const axios = require('axios')
const { version } = require('./package.json')

let URL // 命令行输入的URL
let DIRECTORY_PATH // 命令行指定的下载输出路径
let downloadTaskQueue = {} // 下载任务队列 id: { id: 111, title: 'xxx', isFinished: false, downloadLink: '' }

program
    .version(version)
    .usage('+ 网页路径，可以直接从浏览器中复制')
    .description("xmlyfetcher|喜马拉雅音频下载器")
    .option('-o, --output <directory>', '指定下载音频输出目录', './')
    // .option('-t, --timeout <directory>', '单个音频下载超时时间（秒）', 10)
    .parse(process.argv);

console.log('==>输入参数：', process.argv, program.args, program.output, '\n')
URL = program.args[0]
DIRECTORY_PATH = program.output
process.chdir(DIRECTORY_PATH) // 改变Node.js进程的当前工作目录
handleInputURL(URL)


/**
 * 初步处理输入的URL
 *
 * @param    { String }  url     输入的URL
 *
 * @return   { void }
 */
async function handleInputURL(url) {
    url = url.trim()

    // 使用正则区分出三种不同的URL格式
    if (/[a-z]+\/[0-9]+\/?$/g.test(url)) { // 1. https://www.ximalaya.com/ertong/12891461/  下载整个专辑

    } else if (/[a-z]+\/[0-9]+\/p[0-9]+\/?$/g.test(url)) { // 2. https://www.ximalaya.com/ertong/12891461/p2/        下载第二页
        let albumID = url.split('/')[4]
        let pageNum = url.split('/')[5].slice(1)

        try {
            await fetchTrackIDsByPage(+albumID, +pageNum)
            console.warn('\n【下载已全部完成！】\n')
        } catch (e) {
            console.warn(e)
            console.warn('\n【下载失败！】\n')

            // 终端提示失败的任务
            console.warn('==>以下是下载失败的音频：\n')
            // console.warn('==>downloadTaskQueue', downloadTaskQueue)
            let failedTasks = getUnfinishedTasks(downloadTaskQueue)
            failedTasks.forEach(item => {
                console.warn(`${item.title} ： ${item.downloadLink}`)
            })

        }
    } else if (/[a-z]+\/[0-9]+\/[0-9]+\/?$/g.test(url)) { // 3. https://www.ximalaya.com/ertong/12891461/211393643   下载单个音频
        let trackID = url.split(/\/[0-9]+\//g)[1]

        try {
            await fetchTrackByID(+trackID)
            console.warn('\n【下载已全部完成！】\n')
        } catch (e) {
            console.warn(e)
            console.warn('\n【下载失败！】\n')
        }
    } else {
        console.warn('【请注意】输入不合法，请参阅说明：https://github.com/zeakhold/xmlyfetcher')
    }

    // process.exit(0)
}


/**
 * 根据音频ID下载 音频
 *
 * @param    { Number }  id     音频ID
 *
 * @return   {PromiseLike<T | never>}
 */
async function fetchTrackByID(id) {
    // 初次设置 下载任务队列
    downloadTaskQueue[id] = { id, title: '', isFinished: false, downloadLink: '' }

    let getTrackInfo, reader, writer

    // 获取音频信息
    getTrackInfo = await axios({
        method: 'get',
        url: 'http://mobile.ximalaya.com/v1/track/baseInfo',
        params: {
            device: 'iPhone',
            trackId: id
        }
    })

    // console.warn('==>getTrackInfo.data:', getTrackInfo.data)

    let { title, playUrl64, albumTitle } = getTrackInfo.data

    // 尝试创建专辑文件夹（改造成同步）
    await new Promise((resolve, reject) => {
        fs.mkdir(albumTitle, (err) => {
            if (err && err.code !== 'EEXIST') {
                // 不是【文件夹已存在】情况
                reject(err)
            }
            resolve()
        })
    })

    // 更新 下载任务队列
    downloadTaskQueue[id] = { id, title, isFinished: false, downloadLink: playUrl64 }

    console.warn(`==>音频下载开始：《${title}》`)

    // 下载音频流
    reader = (await axios({
        method: 'get',
        url: playUrl64,
        responseType: 'stream'
    })).data

    // 建立"写数据流"管道
    writer = fs.createWriteStream(`${albumTitle}/${title}.mp3`)

    // 【读取流】结束（随后会自动调用"【写入流】结束"）
    reader.on('end', () => {
        // console.warn('==>end', downloadTaskQueue[id])
    })

    // 存储音频到本地（往管道导流）
    reader.pipe(writer)

    return new Promise((resolve, reject) => {
        // 【写入流】结束
        writer.on('finish', () => {
            // console.warn('==>finish', downloadTaskQueue[id])

            // 更新 下载任务队列
            downloadTaskQueue[id].isFinished = true
            console.warn(`==>音频下载完成：《${title}》`)

            resolve()
        })

        writer.on('error', (e) => {
            console.error(`==>音频【${title}】下载失败`, e)
            reject()
        })
    })
}


/**
 * 根据专辑ID和页面UD获取 当前页面音频的IDs
 *
 * @param    { Number }  albumID     专辑ID
 * @param    { Number }  pageNum     当前页数
 *
 * @return   {PromiseLike<T | never>}
 */
async function fetchTrackIDsByPage(albumID, pageNum) {
    console.warn(`==>开始解析专辑【${albumID}】的第【${pageNum}】页`)

    // 获取当前页所有音频ID
    let getTracksInfo = await axios({
        method: 'get',
        url: 'https://www.ximalaya.com/revision/album/v1/getTracksList',
        params: {
            albumId: albumID,
            pageNum,
        }
    })


    // console.warn('==>getTracksInfo.data:', getTracksInfo.data)

    const { tracks } = getTracksInfo.data.data

    return Promise.all(tracks.map(item => {
        let { trackId } = item

        return fetchTrackByID(+trackId)
    }))
        .then(() => {
            console.warn(`==>专辑【${albumID}】的第【${pageNum}】页，已下载完成\n`)
            return Promise.resolve()
        })
        .catch(e => {
            console.warn(`==>专辑【${albumID}】的第【${pageNum}】页，下载失败`, e)
            return Promise.reject(e)
        })
}


/**
 * 根据专辑ID下获取 整个专辑的音频的IDs
 *
 * @param    { Number }  id     音频ID
 *
 * @return   {PromiseLike<T | never>}
 */
async function fetchTrackIDsByAlbum(id) {

}


/**
 * 取出下载任务队列中，下载未完成的 任务（下载失败或超时）
 *
 * @param    { Object }  queue     下载任务队列
 *
 * @return   { Array }
 */
function getUnfinishedTasks(queue) {
    let result = []

    for(let key in queue){
        if (!queue[key].finished || queue[key].timeout) {
            result.push(queue[key])
        }
    }

    return result
}
