# xmlyfetcher &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/zeakhold/xmlyfetcher/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/xmlyfetcher.svg?style=flat)](https://www.npmjs.com/package/xmlyfetcher) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/zeakhold/xmlyfetcher/compare?expand=1)

> 该工具用于下载喜马拉雅歌曲资源. 喜欢请打个Star！

## 安装
```
npm install -g xmlyfetcher
```

## 功能
- [x] 支持下载 单个音频、某个页面的音频、整个专辑
- [x] 指定下载输出目录
- [x] 支持并发下载
- [x] 超时控制
- [x] 终端提示下载状态：当前下载音频、成功/失败提示等
- [x] 下载失败子任务挂起，最后统一重试1次
- [ ] 根据音频长度，动态计算超时时间
- [ ] 支持指定页数范围的下载


## 使用
Usage: xmlyfetcher [url]

```bash
# 下载专辑
xmlyfetcher https://www.ximalaya.com/ertong/10078066/

# 下载专辑单页
xmlyfetcher https://www.ximalaya.com/ertong/12891461/p2/

# 下载单个曲目
xmlyfetcher https://www.ximalaya.com/ertong/12891461/211393643

# 下载到指定目录
xmlyfetcher https://www.ximalaya.com/ertong/12891461/211393643 -o ~/Downloads

# 指定下载单个音频的超时时间（默认8s）
xmlyfetcher https://www.ximalaya.com/ertong/12891461/211393643 -t 20
```

PS: 可以使用`xmlyfetcher -h`查看更详细的帮助


## 许可

该开源工具基于[MIT许可协议](https://github.com/zeakhold/xmlyfetcher/blob/master/LICENSE)，仅限个人学习，不用于商业等用途。所涉及的音视频资源版权归喜马拉雅所有。
