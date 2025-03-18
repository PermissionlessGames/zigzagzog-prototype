# Useful Commands for ZigZagZog

## Constructor Arguments

To encode constructor arguments for ZigZagZog using `cast`, use:

```bash
cast abi-encode "constructor(uint256,uint64,uint64)" \
    <play_cost_in_wei> \
    <commit_duration_in_seconds> \
    <reveal_duration_in_seconds>
```

Example (with 0.1 ETH play cost, 1 hour commit, 30 min reveal):
```bash
cast abi-encode "constructor(uint256,uint64,uint64)" \
    100000000000000000 \
    3600 \
    1800
```

## Solidity Compiler Version

To check your current Solidity compiler version in Foundry:

```bash
forge --version
```

This will show both the Foundry version and the solc version being used.

You can also check available solc versions and install a specific version:

```bash
# List available versions
foundryup --list

# Install specific solc version
foundryup -C <version>
```

The project's Solidity version requirements are specified in `foundry.toml` and the contract pragma statement. 