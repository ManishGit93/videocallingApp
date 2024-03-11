import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import ReactPlayer from "react-player";
import peer from "../services/peer";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(()=>{
    for(const track of myStream.getTracks()){
      peer.peer.addTrack(track,myStream)
  }
  },[myStream])

  const handleCallAccepted = useCallback(({ from, ans }) => {
    peer.setLocalDescription(ans);
    console.log("call Accepted");
    sendStreams()
  }, [sendStreams]);

  const handleNegoNeeded = useCallback(()=> async()=>{
    const offer = await peer.getOffer();
    socket.emit('peer:nego:needed',{offer,to:remoteSocketId})
  },[remoteSocketId, socket])

useEffect (()=>{
  peer.peer.addEventListener('negotiationneeded',handleNegoNeeded);
  return ()=>{
    peer.peer.removeEventListener("negotiationneeded",handleNegoNeeded)
  }
},[handleNegoNeeded])


const handleNegoNeedIncoming = useCallback(async({from,offer})=>{
const ans = await peer.getAnswer(offer);
socket.email('peer:nego:done',{to:from,ans})
},[socket])


const handleNegoNeededFinal = useCallback(async({ans})=>{
await peer.setLocalDescription(ans)

},[])

  useEffect(()=>{
    peer.peer.addEventListener('track', async (ev) =>{
        const remoteStream = ev.streams;
        console.log('GOT TRACKS');
        setRemoteStream(remoteStream[0])
    })
  },[])

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on('peer:nego:needed',handleNegoNeedIncoming);
    socket.on('peer:nego:final',handleNegoNeededFinal)

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off('peer:nego:needed',handleNegoNeedIncoming);
      socket.off('peer:nego:final',handleNegoNeededFinal)
    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted, handleNegoNeeded, handleNegoNeedIncoming, handleNegoNeededFinal]);

  return (
    <div>
      <h1>RoomPage</h1>
      <h4>{remoteSocketId ? "Connected" : "No one is room"}</h4>
      {myStream &&  <button onClick={sendStreams}>Send Stream</button>}
      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
      {myStream && (
        <>
          <h1>My Stream</h1>
          <ReactPlayer
            playing
            muted
            height="300px"
            width="500px"
            url={myStream}
          />
        </>
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="300px"
            width="500px"
            url={remoteStream}
          />
        </>
      )}
    </div>
  );
};

export default RoomPage;
