# xmlyfetcher

> 该工具用于下载喜马拉雅歌曲资源，可以下载单个音频资源，也可以下载整个专辑. 喜欢的请打个红心!!!

## 安装
```
npm install -g xmlyfetcher
```


## 使用
Usage: xmlyfetcher [url]

```bash
# 下载专辑
xmlyfetcher https://www.ximalaya.com/ertong/23701961/

# 下载专辑单页
xmlyfetcher https://www.ximalaya.com/ertong/12891461/p2/

# 下载单个曲目
xmlyfetcher https://www.ximalaya.com/ertong/12891461/211393643

# 下载到指定目录
xmlyfetcher https://www.ximalaya.com/ertong/12891461/211393643 -o ~/Downloads

# 指定下载单个音频的超时时间（默认10s）
xmlyfetcher https://www.ximalaya.com/ertong/12891461/211393643 -t 20
```

PS: 可以使用`xmlyfetcher -h`查看更详细的帮助



## 许可

该开源工具具有[MIT许可协议](https://github.com/zeakhold/xmlyfetcher/blob/master/LICENSE). 本工具仅限个人学习，不用于商业等用途. 所涉及的音视频资源版权归喜马拉雅所有.
