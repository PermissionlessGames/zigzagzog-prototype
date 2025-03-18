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