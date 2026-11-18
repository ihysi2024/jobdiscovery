"""Shared categories for every job, used by the classifier and (later) the app's filters.

These cover the whole NYC job market, not one field. Keep them stable: the web
app's filters and the market read are built on these exact values. Add new
values at the end of a list rather than renaming existing ones.
"""

ROLE_FAMILIES = [
    "Software Engineering",
    "Machine Learning & AI",
    "Data & Analytics",
    "IT & Security",
    "Product Management",
    "Design & UX",
    "Engineering (non-software)",
    "Science & Research",
    "Healthcare & Clinical",
    "Sales & Business Development",
    "Marketing & Communications",
    "Customer Success & Support",
    "Operations",
    "Finance & Accounting",
    "Investing & Trading",
    "Legal & Compliance",
    "People & Recruiting",
    "Consulting & Strategy",
    "Education & Training",
    "Media, Content & Editorial",
    "Creative & Arts",
    "Administrative",
    "Supply Chain & Logistics",
    "Skilled Trades & Facilities",
    "Hospitality & Food Service",
    "Retail",
    "Social Services & Nonprofit Programs",
    "Executive Leadership",
    "Other",
]

INDUSTRIES = [
    "Software & Internet",
    "AI & Machine Learning",
    "Fintech",
    "Banking & Investment",
    "Insurance",
    "Healthcare Providers",
    "Health Tech",
    "Biotech & Pharma",
    "Medical Devices & Diagnostics",
    "Media & Entertainment",
    "Advertising & Marketing",
    "Retail & E-commerce",
    "Consumer Products",
    "Fashion & Beauty",
    "Food & Beverage",
    "Real Estate & Construction",
    "Education & EdTech",
    "Government & Public Sector",
    "Nonprofit",
    "Professional Services & Consulting",
    "Legal Services",
    "Energy & Climate",
    "Transportation & Logistics",
    "Hospitality & Travel",
    "Manufacturing & Hardware",
    "Crypto & Web3",
    "Telecommunications",
    "Aerospace & Defense",
    "Other",
]

SENIORITY = ["intern", "entry", "mid", "senior", "staff_principal", "manager", "director", "executive"]

EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "temporary", "internship", "fellowship", "other"]

WORK_MODES = ["onsite", "hybrid", "remote"]

DEGREES = ["none", "high_school", "associate", "bachelors", "masters", "phd", "professional", "unknown"]

SALARY_PERIODS = ["year", "month", "week", "day", "hour"]

INTERVIEW_STAGES = [
    "application_review", "recruiter_screen", "hiring_manager", "technical_screen", "take_home",
    "case_study", "portfolio_review", "panel_onsite", "presentation", "reference_check", "background_check",
    "offer", "other",
]
