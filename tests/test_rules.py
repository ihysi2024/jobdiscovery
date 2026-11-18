import pytest

from jobdiscovery import rules as R


# ------------------------------------------------------------------ salary

@pytest.mark.parametrize("text,expected", [
    ("The base salary range for this role is $165,000 - $195,000 per year.", (165000, 195000, "year")),
    ("Pay Range: $120K–$150K", (120000, 150000, "year")),
    ("Salary: $120-150K plus equity", (120000, 150000, "year")),
    ("Compensation: $45.00/hr - $55.00/hr", (45, 55, "hour")),
    ("The hourly rate for this position is $28 to $32.", (28, 32, "hour")),
    ("New York pay range\n$140,000—$175,000 USD", (140000, 175000, "year")),
    ("Base pay: USD $95,000 and $110,000 annually", (95000, 110000, "year")),
    ("Annual salary of $85,000", (85000, 85000, "year")),
    ("The expected salary range is $6,000 - $7,500 per month", (6000, 7500, "month")),
])
def test_salary_found(text, expected):
    s = R.extract_salary(text)
    assert s is not None, text
    assert (s["min"], s["max"], s["period"]) == expected


@pytest.mark.parametrize("text", [
    "",
    "We raised $40 million from top investors.",
    "Annual learning budget of $2,000 and a $500 home office stipend.",
    "Sign-on bonus of $10,000.",
    "Our customers save $5 - $10 per order.",
    "No salary info here.",
])
def test_salary_not_found(text):
    assert R.extract_salary(text) is None


def test_salary_prefers_base_over_bonus():
    text = "Up to $20,000 sign-on bonus. The base salary range is $130,000 - $160,000."
    s = R.extract_salary(text)
    assert (s["min"], s["max"]) == (130000, 160000)


# ------------------------------------------------------------------ seniority

@pytest.mark.parametrize("title,level", [
    ("Software Engineer Intern", "intern"),
    ("Summer Analyst 2027", "intern"),
    ("VP of Engineering", "executive"),
    ("Chief Medical Officer", "executive"),
    ("Director, Data Science", "director"),
    ("Head of Growth", "director"),
    ("Staff Software Engineer", "staff_principal"),
    ("Principal Product Designer", "staff_principal"),
    ("Engineering Manager, Platform", "manager"),
    ("Nurse Manager - ICU", "manager"),
    ("Product Manager", "mid"),
    ("Senior Product Manager", "senior"),
    ("Account Manager", "mid"),
    ("Senior Software Engineer", "senior"),
    ("Sr. Data Analyst", "senior"),
    ("Software Engineer III", "senior"),
    ("Junior Designer", "entry"),
    ("Software Engineer I", "entry"),
    ("Associate, Investment Banking", "entry"),
    ("Software Engineer II", "mid"),
    ("Machine Learning Engineer", "mid"),
    ("Registered Nurse", "mid"),
])
def test_seniority(title, level):
    assert R.seniority_from_title(title) == level, title


def test_seniority_falls_back_to_years():
    assert R.seniority_from_title("Data Engineer", 7) == "senior"
    assert R.seniority_from_title("Data Engineer", 1) == "entry"
    assert R.seniority_from_title("Data Engineer", 3) == "mid"


# ------------------------------------------------------------------ experience, degree, visa

@pytest.mark.parametrize("text,years", [
    ("3+ years of experience building ML systems", 3),
    ("At least 5 years of professional experience", 5),
    ("2-4 years experience in a similar role", 2),
    ("Minimum of seven (7) years of experience", 7),
    ("You have 4 yrs of experience with Python", 4),
    ("We were founded 10 years ago.", None),
    ("", None),
])
def test_years(text, years):
    assert R.years_experience(text) == years


@pytest.mark.parametrize("text,degree", [
    ("Bachelor's degree in Computer Science required; Master's preferred.", "bachelors"),
    ("MS or PhD in a quantitative field", "masters"),
    ("PhD in biology or related field", "phd"),
    ("High school diploma or GED required", "high_school"),
    ("Active RN license. BSN preferred.", "unknown"),
    ("JD from an accredited law school", "professional"),
    ("No degree required.", "none"),
    ("We value curiosity.", "unknown"),
])
def test_degree(text, degree):
    assert R.degree_required(text) == degree


@pytest.mark.parametrize("text,answer", [
    ("We are unable to sponsor visas for this role.", "no"),
    ("Candidates must be authorized to work in the US without sponsorship.", "no"),
    ("This position is not eligible for visa sponsorship.", "no"),
    ("Visa sponsorship is available for this role.", "yes"),
    ("We will sponsor H-1B visas.", "yes"),
    ("Nothing about visas.", "unknown"),
])
def test_visa(text, answer):
    assert R.visa_sponsorship(text) == answer


# ------------------------------------------------------------------ work mode, employment type

def test_work_mode():
    assert R.work_mode("hybrid", [], "", "fully remote") == "hybrid"           # structured wins
    assert R.work_mode(None, ["New York, NY (Hybrid)"], "Engineer", "") == "hybrid"
    assert R.work_mode(None, ["Remote - US"], "Engineer", "") == "remote"
    assert R.work_mode(None, ["New York"], "Engineer", "This role is fully remote.") == "remote"
    assert R.work_mode(None, ["New York"], "Engineer", "We have remote-friendly tools.") is None
    assert R.work_mode(None, ["New York"], "Engineer", "This is an on-site role in Brooklyn.") == "onsite"
    assert R.work_mode(None, ["New York"], "Engineer", "") is None


def test_employment_type():
    assert R.employment_type("Data Science Intern", "") == "internship"
    assert R.employment_type("Barista", "This is a part-time role.") == "part_time"
    assert R.employment_type("Contract Designer", "") == "contract"
    assert R.employment_type("Seasonal Associate", "") == "temporary"
    assert R.employment_type("Engineer", "Full-time, benefits included.") == "full_time"


def test_extract_combines_everything():
    p = {"title": "Senior Data Engineer", "locations": '["New York, NY"]', "workplace_type": "",
         "description_text": "5+ years of experience. Bachelor's degree required. Hybrid, 3 days in office. "
                             "We are unable to sponsor visas. Salary range: $170,000 - $200,000."}
    f = R.extract(p)
    assert f["seniority"] == "senior" and f["years_experience_min"] == 5
    assert f["salary"] == {"min": 170000, "max": 200000, "period": "year", "currency": "USD"}
    assert (f["degree_required"], f["visa_sponsorship"], f["work_mode"], f["employment_type"]) == (
        "bachelors", "no", "hybrid", "full_time")


# Regressions from real postings (first live classification run)

from jobdiscovery import rules  # noqa: E402


def test_salary_with_cents_and_per_year_slash():
    s = rules.extract_salary("Pay range: Sr. Sales Manager/Level II: $150,000.00 - $205,000.00/per year")
    assert (s["min"], s["max"], s["period"]) == (150000, 205000, "year")


@pytest.mark.parametrize("text,expected", [
    ("This position will be onsite in Bastrop, TX. Remote work is not available for this role.", "onsite"),
    ("Requires onsite presence. No remote or hybrid work allowed.", "onsite"),
    ("This is a non-remote position based in our office.", None),
])
def test_work_mode_ignores_ruled_out_modes(text, expected):
    assert rules.work_mode(None, ["New York, NY"], "Sales Manager", text) == expected


def test_citizenship_requirement_means_no_sponsorship():
    assert rules.visa_sponsorship("To comply with ITAR, applicant must be a U.S. citizen or lawful permanent resident.") == "no"
    assert rules.visa_sponsorship("Must hold an active Top Secret clearance.") == "no"
