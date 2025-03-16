.PHONY: build test clean rebuild retest list-forge-tests bindings build-contracts rebuild-contracts clean-contracts unbind rebind

build: build-contracts bind zzz

zzz:
	go build -o zzz ./cmd/zzz

build-contracts: src/ZigZagZog.sol
	forge build

test: build-contracts
	forge test

src/ZigZagZog.sol:
	forge build --skip test
	jq .abi out/ZigZagZog.sol/ZigZagZog.json | solface -annotations -license UNLICENSED -name IZigZagZog -pragma "^0.8.13" >src/IZigZagZog.sol

clean: clean-contracts unbind
	rm -f zzz

clean-contracts:
	rm -rf out/
	rm -f src/IZigZagZog.sol

rebuild: clean build

rebuild-contracts: clean-contracts build-contracts

retest: clean test

out/ZigZagZog.sol/ZigZagZog.json: build-contracts

bindings/zigzagzog/ZigZagZog.go: build-contracts
	mkdir -p bindings/zigzagzog
	seer evm generate \
		--cli \
		--foundry out/ZigZagZog.sol/ZigZagZog.json \
		--package zigzagzog \
		--struct ZigZagZog \
		--output bindings/zigzagzog/ZigZagZog.go

bind: bindings/zigzagzog/ZigZagZog.go

unbind:
	rm -f bindings/zigzagzog/*

rebind: unbind bind
