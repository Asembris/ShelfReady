import pytest

from deploy.inspect_existing import APPROVED, validate_inventory


def inventory():
    return {"instances": {role: {"id": identifier, "main_ip": address}
                          for role, (identifier, address) in APPROVED.items()}}


def test_only_existing_instance_identities_are_accepted():
    state = inventory()
    validate_inventory(state)
    state["instances"]["runner"]["id"] = "replacement"
    with pytest.raises(ValueError, match="identity differs"):
        validate_inventory(state)


def test_additional_hosts_are_rejected_before_ssh():
    state = inventory()
    state["instances"]["extra"] = {}
    with pytest.raises(ValueError, match="Exactly the two"):
        validate_inventory(state)
