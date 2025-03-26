# Deployment of ZigZagZog

## Environment

- [x]  Set environment
    
    ```bash
    export RPC=https://testnet-rpc.game7.io
	export EXECUTOR_KEY=~/.brownie/accounts/dao-dev.json
	export PLAYER_KEY=~/.brownie/accounts/wampleek.json
	export EXECUTOR=0x9ed191DB1829371F116Deb9748c26B49467a592A
	export PLAYER=0x5270Be273265f6F8ab034dF137FF82fc1E468F88
	export G7_TESTNET_API=https://testnet.game7.io/api
    ```

 ## Deploy contracts

- [x]  Deploy new authorization contract
    
    ```bash
		./zzz contract deploy \
			--play-cost 1000 \
			--commit-duration 120 \
			--reveal-duration 120 \
			--rpc $RPC \
			--keyfile $EXECUTOR_KEY \
			--password $PASSWORD \
			--verify \
			--api $G7_TESTNET_API \
			--api-key $BLOCKSCOUT_API_KEY
    ```
