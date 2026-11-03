import pytest

from shelfready.store import main


@pytest.mark.live
def test_native_import_readback_reset():
    main()
