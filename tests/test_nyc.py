import pytest

from jobdiscovery.nyc import any_nyc, location_is_nyc

NYC = [
    "New York, NY",
    "New York, New York, United States",
    "New York",
    "New York (Hybrid)",
    "New York - Office",
    "NYC",
    "NYC - Hybrid",
    "Brooklyn, NY",
    "Long Island City, NY",
    "Manhattan",
    "The Bronx",
    "Staten Island, New York",
    "New York City",
    "Remote - New York City",
    "San Francisco, CA; New York, NY",
    "San Francisco or New York",
    "10013 New York",
    "New York, NY 10001",
    "US - NY - New York",
    "New York, US",
]

NOT_NYC = [
    "",
    "San Francisco, CA",
    "Albany, New York",
    "Buffalo, NY",
    "White Plains, NY",
    "Long Island, NY",
    "Melville, New York",
    "Remote - New York",
    "New York (Remote)",
    "Remote",
    "Remote - US",
    "Jersey City, NJ",
    "Newark, New Jersey",
    "York, PA",
    "New York State",
    "Yonkers, NY",
]


@pytest.mark.parametrize("loc", NYC)
def test_nyc(loc):
    assert location_is_nyc(loc), loc


@pytest.mark.parametrize("loc", NOT_NYC)
def test_not_nyc(loc):
    assert not location_is_nyc(loc), loc


def test_any_nyc():
    assert any_nyc(["London", "Brooklyn, NY"])
    assert not any_nyc(["London", "Paris"])
