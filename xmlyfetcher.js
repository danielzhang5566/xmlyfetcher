#!/usr/bin/env node

/**
 * @file 喜马拉雅音频下载器
 * @author zeakhold
 * @description 本工具用于下载ximalaya.com.上的音频，支持以下三种形式的URL：
 *      1. https://www.ximalaya.com/ertong/10078066/               下载整个专辑
 *      2. https://www.ximalaya.com/ertong/12891461/p2/             下载第二页
 *      3. https://www.ximalaya.com/ertong/12891461/211393643       下载单个音频
 */

const fs = require('fs')
const program = require('commander')
const axios = require('axios')
const { version } = require('./package.json')

let URL // 命令行输入的URL
let DIRECTORY_PATH // 命令行指定的下载输出路径
let CONCURRENT_NUM // 并发下载音频的任务数量
let TIMEOUT // 单个音频下载超时时间（秒）
let downloadTaskQueue = {} // 下载任务队列 { id: { id: 111, title: 'xxx', isFinished: false, isTimeout: false, downloadLink: '' } }

program
    .version(version)
    .usage('[url]')
    .description("xmlyfetcher|喜马拉雅音频下载器")
    .option('-o, --output <directory>', '指定下载音频输出目录', './')
    .option('-c, --concurrent <directory>', '并发下载音频的任务数量', 5) // 默认5个
    .option('-t, --timeout <directory>', '单个音频下载超时时间（秒）', 10) // 默认10s
    .parse(process.argv);

console.log('==>输入参数：', process.argv, program.args, program.output, program.concurrent, program.timeout, '\n')
URL = program.args[0]
DIRECTORY_PATH = program.output
CONCURRENT_NUM = program.concurrent
TIMEOUT = program.timeout * 1000
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
    if (/[a-z]+\/[0-9]+\/?$/g.test(url)) { // 1. 下载整个专辑 https://www.ximalaya.com/jiaoyu/19304542/
        let albumID = +url.split('/')[4]

        try {
            await fetchTrackByAlbum(albumID)
            console.warn(`【总共${Object.keys(downloadTaskQueue).length}个音频，已全部下载完成！】`)
        } catch (e) {
            console.warn(e)
            console.warn('\n【下载失败！】\n')
        }
    } else if (/[a-z]+\/[0-9]+\/p[0-9]+\/?$/g.test(url)) { // 2. 下载第n页 https://www.ximalaya.com/ertong/12891461/p2/
        let albumID = +url.split('/')[4]
        let pageNum = +url.split('/')[5].slice(1)

        try {
            await fetchTrackByPage(albumID, pageNum)
            console.warn(`【总共${Object.keys(downloadTaskQueue).length}个音频，已全部下载完成！】`)
        } catch (e) {
            console.warn(e)
            console.warn('\n【下载失败！】\n')

            // 终端提示失败的任务
            console.warn('==>以下是下载失败的音频，您可以在浏览器打开链接地址手动下载：\n')
            // console.warn('==>downloadTaskQueue', downloadTaskQueue)
            let failedTasks = getUnfinishedTasks(downloadTaskQueue)
            failedTasks.forEach(item => {
                console.warn(`${item.title} ： ${item.downloadLink}`)
            })

        }
    } else if (/[a-z]+\/[0-9]+\/[0-9]+\/?$/g.test(url)) { // 3. 下载单个音频 https://www.ximalaya.com/ertong/12891461/211393643
        let trackID = +url.split(/\/[0-9]+\//g)[1]

        try {
            await fetchTrackByID(trackID, TIMEOUT)
            console.warn('\n【总共1个音频，下载已完成！】\n')
        } catch (e) {
            console.warn(e)
            console.warn('\n【下载失败！】\n')
        }
    } else {
        console.warn('【请注意】输入不合法，请参阅说明：https://github.com/zeakhold/xmlyfetcher')
    }

    process.exit(0)
}


/**
 * 根据音频ID下载 音频
 *
 * @param    { Number }   id            音频ID
 * @param    { Number }   timeout       "超时"时间
 *
 * @return   {PromiseLike<T | never>}
 */
async function fetchTrackByID(id, timeout) {
    // 初次设置 下载任务队列
    downloadTaskQueue[id] = { id, title: '', isFinished: false, isTimeout: false, downloadLink: '' }

    let getTrackInfo, reader, writer

    // 获取音频信息
    getTrackInfo = await axios({
        method: 'get',
        url: `http://www.ximalaya.com/tracks/${id}.json`,
    })

    // console.warn('==>getTrackInfo.data:', getTrackInfo.data)

    let { title, play_path_64, album_title } = getTrackInfo.data

    // 尝试创建专辑文件夹（改造成同步）
    await new Promise((resolve, reject) => {
        fs.mkdir(album_title, (err) => {
            if (err && err.code !== 'EEXIST') {
                // 不是【文件夹已存在】情况
                reject(err)
            }
            resolve()
        })
    })

    // 更新 下载任务队列
    downloadTaskQueue[id] = { id, title, isFinished: false, isTimeout: false, downloadLink: play_path_64 }

    console.warn(`==>音频下载开始<：《${title}》`)

    // 建立【读取流】（下载音频流）
    reader = (await axios({
        method: 'get',
        url: play_path_64,
        responseType: 'stream'
    })).data

    // 建立【写入流】
    writer = fs.createWriteStream(`${album_title}/${title}.mp3`)

    // 【读取流】结束（随后会自动调用"【写入流】结束"）
    reader.on('end', () => {
        // console.warn('==>end', downloadTaskQueue[id])
    })

    // 超时控制
    setTimeout(() => {
        if (!downloadTaskQueue[id].isFinished) {
            downloadTaskQueue[id].isTimeout = true
            reader.unpipe()     // 关闭【流管道】
            writer.end()        // 结束【写入流】
        }
    }, timeout)

    // 建立【流管道】（存储音频到本地）
    reader.pipe(writer)

    return new Promise((resolve, reject) => {
        // 【写入流】结束
        writer.on('finish', () => {
            // console.warn('==>finish', downloadTaskQueue[id])

            if (downloadTaskQueue[id].isTimeout) {
                console.warn(`\n==>音频下载超时：《${title}》，您可以通过-t参数提高超时时间，也可以在浏览器打开链接地址手动下载：${downloadTaskQueue[id].downloadLink}\n`)
                reject()
            } else {
                // 更新 下载任务队列
                downloadTaskQueue[id].isFinished = true
                console.warn(`==>音频下载完成>：《${title}》`)

                resolve()
            }
        })

        writer.on('error', (e) => {
            console.error(`==>音频【${title}】下载失败`, e)
            reject()
        })
    })
}


/**
 * 根据专辑ID和页面UD下载 当前页面所有音频
 *
 * @param    { Number }  albumID     专辑ID
 * @param    { Number }  pageNum     当前页数
 *
 * @return   {PromiseLike<T | never>}
 */
async function fetchTrackByPage(albumID, pageNum) {
    console.warn(`\n==>开始解析专辑【${albumID}】的第【${pageNum}】页\n`)

    // 获取当前页所有音频ID
    let getTracksInfo = await axios({
        method: 'get',
        url: 'https://www.ximalaya.com/revision/album/v1/getTracksList',
        params: {
            albumId: albumID,
            pageNum,
            // pageSize: 30 // 喜马拉雅每个页面默认是30个音频
        }
    })

    // console.warn('==>getTracksInfo.data:', getTracksInfo.data)

    let { tracks } = getTracksInfo.data.data

    // 将当前页音频数组，按照并发任务数设置，进行拆分，串行执行。
    let taskList = cutArray(tracks, CONCURRENT_NUM)

    return new Promise(async (resolve, reject) => {
        let isAllSuccess = true

        // 执行划分好的子任务（通过await转同步，串行执行）
        for(let i = 0; i < taskList.length; i++) {
            await Promise.all(taskList[i].map(item => {
                let { trackId } = item

                return fetchTrackByID(+trackId, CONCURRENT_NUM * TIMEOUT) // 注意这里的超时时间，需要设置为单个子任务总时间
            }))
                .catch(e => {
                    isAllSuccess = false // 标记
                    console.warn(`==>专辑【${albumID}】的第【${pageNum}】页的第【${i}】个子任务，执行失败`)
                })
        }

        if (isAllSuccess) {
            console.warn(`\n==>专辑【${albumID}】的第【${pageNum}】页，已下载完成\n`)
            resolve()
        } else {
            console.warn(`\n==>专辑【${albumID}】的第【${pageNum}】页，未能完全下载，请找到下载失败音频的提示链接，手动下载～`)
            reject()
        }
    })
}


/**
 * 根据专辑ID下获取 整个专辑的音频
 *
 * @param    { Number }  albumID     音频ID
 *
 * @return   {PromiseLike<T | never>}
 */
async function fetchTrackByAlbum(albumID) {
    console.warn(`\n==>开始解析专辑【${albumID}】\n`)

    // 获取当前页所有音频ID
    let getTracksInfo = await axios({
        method: 'get',
        url: 'http://www.ximalaya.com/revision/album',
        params: {
            albumId: albumID,
        }
    })

    // console.warn('==>getTracksInfo.data:', getTracksInfo.data)

    let { mainInfo, tracksInfo } = getTracksInfo.data.data
    let { album_title } = mainInfo
    let { pageSize, trackTotalCount } = tracksInfo || {} // pageSize 为每一个页面音频数量，默认为30；trackTotalCount是整个专辑音频总数
    let totalPageNum = Math.ceil(trackTotalCount / pageSize) // 整个专辑有多少页

    return new Promise(async (resolve, reject) => {
        let isAllSuccess = true

        // 拆分为一页页，然后先后调用fetchTrackByPage下载
        for (let i = 1; i <= totalPageNum; i++) {
            await fetchTrackByPage(albumID, i)
        }

        if (isAllSuccess) {
            console.warn(`\n==>专辑《${album_title}》，已下载完成\n`)
            resolve()
        } else {
            console.warn(`\n==>专辑《${album_title}》，未能完全下载，请找到下载失败音频的提示链接，手动下载～`)
            reject()
        }
    })
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
        if (!queue[key].isFinished) {
            result.push(queue[key])
        }
    }

    return result
}


/**
 * 将一个数组，进行分组
 * 例如：输入cutArray([1,1,1,1], 3) 输出[[1,1,1], [1]]
 *
 * @param    { Array }   arr     原数组
 * @param    { Number }  num     分组单位
 *
 * @return   { Array }
 */
function cutArray(arr, num) {
    let result = []

    while (arr.length > num) {
        result.push(arr.splice(0, num))
    }

    result.push(arr) // 切到最后那一组

    return result
}
