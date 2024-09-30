import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { unixfs } from "@helia/unixfs";
import { bootstrap } from "@libp2p/bootstrap";
import { identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";
import { createHelia } from "helia";
import { createLibp2p } from "libp2p";
import { multiaddr } from "@multiformats/multiaddr";
import * as filters from "@libp2p/websockets/filters";

import { React, useState, useEffect } from "react";

const IpfsComponent = () => {
  const [id, setId] = useState(null);
  const [helia, setHelia] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connection, setConnection] = useState("");
  const [multiAddress, setMultiAddress] = useState("");

  //網頁剛載入時，useEffect會執行一次
  useEffect(() => {
    //初始化的function
    const init = async () => {
      //如果有helia 則return
      if (helia) return;

      const blockstore = new MemoryBlockstore();
      const datastore = new MemoryDatastore();

      const libp2p = await createLibp2p({
        datastore,
        // addresses: {
        //   listen: ["/ip4/127.0.0.1/tcp/0/wss"], // 安全 WebSocket (wss)
        // },
        transports: [
          webSockets({
            // Connect to all sockets, even insecure ones
            filter: filters.all,
          }),
        ],
        connectionGater: {
          // 設定允許所有的地址進行連接
          denyDialMultiaddr: async () => false, // 不拒絕任何地址
          filterMultiaddrForPeer: async () => true, // 接受所有 peer 地址
        },
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        peerDiscovery: [
          bootstrap({
            list: [
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
            ],
          }),
        ],
        services: {
          //節點之間的身份驗證
          identify: identify(),
        },
      });

      //若沒有則建立helia節點
      const heliaNode = await createHelia({
        datastore,
        blockstore,
        libp2p,
      });
      //取得peerID
      const nodeId = heliaNode.libp2p.peerId.toString();
      //如果節點的狀態是started，則回傳true
      const nodeIsOnline = heliaNode.libp2p.status === "started";

      // const address = heliaNode.libp2p.getMultiaddrs();
      // console.log(`address: ${address}`);

      //setState，設定helia節點，peerID，節點狀態
      setHelia(heliaNode);
      setId(nodeId);
      setIsOnline(nodeIsOnline);
      //console.log(heliaNode.libp2p.getConnections());
      setConnection(heliaNode.libp2p.getConnections());

      //節點添加event監聽器，peer發現
      heliaNode.libp2p.addEventListener("peer:discovery", (evt) => {
        console.log("Discovered %s", evt.detail.id.toString()); // Log discovered peer 紀錄發現到的peer
      });

      heliaNode.libp2p.addEventListener("peer:connect", (evt) => {
        console.log("Connected to %s", evt.detail.toString()); // Log connected peer 紀錄已連線的peer
      });
    };
    init();
  }, [helia]);

  //如果沒有helia節點，或是沒有id，這個component回傳字串
  if (!helia || !id) {
    return <h4>Starting Helia...</h4>;
  }

  async function UpdateUI() {
    if (helia) {
      try {
        setConnection(helia.libp2p.getConnections());
      } catch (error) {
        console.log(error);
      }
    }
  }

  const callDail = async () => {
    // console.log(multiAddress);
    // console.log(helia);
    const multiAddr = multiaddr(multiAddress);
    // console.log(multiAddr);
    try {
      await helia.libp2p.dial(multiAddr);
      //UpdateUI();
      console.log(`connection: ${helia.libp2p.getConnections()}`);
      // await heliaNode.libp2p.dial({
      //   onSuccess: handleSuccess,
      //   onError: handleError,
      // })
    } catch (error) {
      // handleErrorNotification();
      console.log(error);
    }
  };

  //預設情況下，回傳節點的ID，和狀態
  return (
    <div>
      <h4 data-test="id">ID: {id.toString()}</h4>
      <h4 data-test="status">Status: {isOnline ? "Online" : "Offline"}</h4>
      <h4>Connection: {connection}</h4>
      <h4>
        Task:
        <input
          type="text"
          placeholder="MultiAddress"
          value={multiAddress}
          onChange={(e) => setMultiAddress(e.target.value)}
        />
      </h4>
      <button onClick={callDail}>Connect</button>
    </div>
  );
};

export default IpfsComponent;
