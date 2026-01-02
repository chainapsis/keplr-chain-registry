package garcia_test

import (
	"testing"

	keepertest "garcia/testutil/keeper"
	"garcia/testutil/nullify"
	garcia "garcia/x/garcia/module"
	"garcia/x/garcia/types"

	"github.com/stretchr/testify/require"
)

func TestGenesis(t *testing.T) {
	genesisState := types.GenesisState{
		Params: types.DefaultParams(),

		// this line is used by starport scaffolding # genesis/test/state
	}

	k, ctx := keepertest.GarciaKeeper(t)
	garcia.InitGenesis(ctx, k, genesisState)
	got := garcia.ExportGenesis(ctx, k)
	require.NotNil(t, got)

	nullify.Fill(&genesisState)
	nullify.Fill(got)

	// this line is used by starport scaffolding # genesis/test/assert
}
