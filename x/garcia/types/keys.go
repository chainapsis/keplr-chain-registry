package types

const (
	// ModuleName defines the module name
	ModuleName = "garcia"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_garcia"
)

var (
	ParamsKey = []byte("p_garcia")
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}
