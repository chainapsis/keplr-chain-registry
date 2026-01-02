package keeper_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	keepertest "garcia/testutil/keeper"
	"garcia/x/garcia/types"
)

func TestGetParams(t *testing.T) {
	k, ctx := keepertest.GarciaKeeper(t)
	params := types.DefaultParams()

	require.NoError(t, k.SetParams(ctx, params))
	require.EqualValues(t, params, k.GetParams(ctx))
}
