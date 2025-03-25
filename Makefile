.PHONY: build test clean rebuild retest list-forge-tests bind build-contracts rebuild-contracts clean-contracts unbind rebind

build: build-contracts bind zzz zerve

zzz:
	go build -o zzz ./cmd/zzz

zerve:
	go build -o zerve ./cmd/zerve

build-contracts: src/ZigZagZog.sol
	forge build

test: build-contracts
	forge test

src/ZigZagZog.sol:
	forge build --skip test
	jq .abi out/ZigZagZog.sol/ZigZagZog.json | solface -annotations -license UNLICENSED -name IZigZagZog -pragma "^0.8.13" >src/IZigZagZog.sol

clean: clean-contracts unbind
	rm -f zzz
	rm -f zerve

clean-contracts:
	rm -rf out/
	rm -f src/IZigZagZog.sol

rebuild: clean build

rebuild-contracts: clean-contracts build-contracts

retest: clean test

out/ZigZagZog.sol/ZigZagZog.json: build-contracts

bindings/ZigZagZog/ZigZagZog.go: build-contracts
	mkdir -p bindings/ZigZagZog
	seer evm generate \
		--cli \
		--foundry out/ZigZagZog.sol/ZigZagZog.json \
		--package zigzagzog \
		--struct ZigZagZog \
		--output bindings/zigzagzog/ZigZagZog.go

bind: bindings/ZigZagZog/ZigZagZog.go

unbind:
	rm -f bindings/ZigZagZog/*

rebind: unbind bind
