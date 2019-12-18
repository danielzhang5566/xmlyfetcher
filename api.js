/**
 * @file 喜马拉雅 API
 * @author zeakhold
 */

module.exports = {
    tracks: "http://www.ximalaya.com/tracks/<%=tracksID%>.json",
    getTracksList: "http://www.ximalaya.com/revision/album/getTracksList?albumId=<%=albumId%>&pageNum=<%=pageNum%>",
    album: "http://www.ximalaya.com/revision/album?albumId=<%=albumId%>"
}
