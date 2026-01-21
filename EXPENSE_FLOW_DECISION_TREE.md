# Expense Flow Decision Tree

This document shows the complete decision tree for all questions in the expense survey flow.

## Question #1: Income Sources
**Location:** `src/pages/IncomeFlow.tsx`  
**Type:** Multi-stream income input  
**Next:** Question #2 (Profile)

---

## Question #2: Profile - Household
**ID:** `profile.household`  
**Question:** "Do you budget as a single-person household?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #2c:** Profile - Dependents

### Branch: No
→ **Question #2a:** Profile - Partner

---

## Question #2a: Profile - Partner
**ID:** `profile.partner`  
**Question:** "Will you include a partner's income/expenses?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #2b:** Profile - Income Split

### Branch: No
→ **Question #2c:** Profile - Dependents

---

## Question #2b: Profile - Income Split
**ID:** `profile.income_split`  
**Question:** "How will you split shared expenses?"  
**Type:** Single Select (50/50, Proportional to income, Other)  
**Next:** Question #2c

---

## Question #2c: Profile - Dependents
**ID:** `profile.dependents`  
**Question:** "Do you have dependents (children or others)?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #2d:** Profile - Number of Dependents

### Branch: No
→ **Question #3:** Housing - Start

---

## Question #2d: Profile - Number of Dependents
**ID:** `profile.num_dependents`  
**Question:** "How many dependents?"  
**Type:** Number  
**Next:** Question #3

---

## Question #3: Housing - Start
**ID:** `housing.start`  
**Question:** "Do you pay rent or a mortgage?"  
**Type:** Single Select (Rent, Mortgage, Neither)

### Branch: Rent
→ **Question #3a:** Housing - Rent Amount

### Branch: Mortgage
→ **Question #3b:** Housing - Mortgage Amount

### Branch: Neither
→ **Question #3e:** Housing - Utilities Check

---

## Question #3a: Housing - Rent Amount
**ID:** `housing.rent_amount`  
**Question:** "Monthly rent amount ($)?"  
**Type:** Currency  
**Next:** Question #3e

---

## Question #3b: Housing - Mortgage Amount
**ID:** `housing.mortgage_amount`  
**Question:** "Monthly mortgage payment ($)?"  
**Type:** Currency  
**Next:** Question #3c

---

## Question #3c: Housing - Taxes/HOA
**ID:** `housing.taxes_hoa`  
**Question:** "Do you pay property taxes/HOA separately?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #3d:** Housing - Taxes/HOA Amount

### Branch: No
→ **Question #3e:** Housing - Utilities Check

---

## Question #3d: Housing - Taxes/HOA Amount
**ID:** `housing.taxes_hoa_amount`  
**Question:** "Monthly property taxes/HOA ($)?"  
**Type:** Currency  
**Next:** Question #3e

---

## Question #3e: Housing - Utilities Check
**ID:** `housing.utilities_check`  
**Question:** "Which utilities do you pay?"  
**Type:** Multi-Select (Electric, Gas, Water/Sewer, Trash, Internet)  
**Next:** Question #3f

---

## Question #3f: Housing - Utilities Amounts
**ID:** `housing.utilities_amounts`  
**Question:** "Enter monthly amounts for selected utilities"  
**Type:** Table  
**Next:** Question #3g

---

## Question #3g: Housing - Maintenance
**ID:** `housing.maintenance`  
**Question:** "Do you set aside money for home maintenance?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #3h:** Housing - Maintenance Amount

### Branch: No
→ **Question #4:** Transportation - Start

---

## Question #3h: Housing - Maintenance Amount
**ID:** `housing.maintenance_amount`  
**Question:** "Monthly home maintenance budget ($)?"  
**Type:** Currency  
**Next:** Question #4

---

## Question #4: Transportation - Start
**ID:** `transport.start`  
**Question:** "Do you own or lease a vehicle?"  
**Type:** Single Select (Own, Lease, No vehicle)

### Branch: Own
→ **Question #4a:** Transportation - Loan Payment Check

### Branch: Lease
→ **Question #4c:** Transportation - Lease Payment

### Branch: No vehicle
→ **Question #4h:** Transportation - Public Transit Check

---

## Question #4a: Transportation - Loan Payment Check
**ID:** `transport.loan_payment_check`  
**Question:** "Do you have a car loan payment?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #4b:** Transportation - Loan Payment

### Branch: No
→ **Question #4d:** Transportation - Insurance

---

## Question #4b: Transportation - Loan Payment
**ID:** `transport.loan_payment`  
**Question:** "Monthly car loan payment ($)?"  
**Type:** Currency  
**Next:** Question #4d

---

## Question #4c: Transportation - Lease Payment
**ID:** `transport.lease_payment`  
**Question:** "Monthly lease payment ($)?"  
**Type:** Currency  
**Next:** Question #4d

---

## Question #4d: Transportation - Insurance
**ID:** `transport.insurance`  
**Question:** "Monthly auto insurance ($)?"  
**Type:** Currency  
**Next:** Question #4e

---

## Question #4e: Transportation - Fuel Type
**ID:** `transport.fuel_type`  
**Question:** "Primary fuel type?"  
**Type:** Single Select (Gasoline, EV charging, Mixed)  
**Next:** Question #4f

---

## Question #4f: Transportation - Fuel Amount
**ID:** `transport.fuel_amount`  
**Question:** "Average monthly fuel/charging cost ($)?"  
**Type:** Currency  
**Next:** Question #4g

---

## Question #4g: Transportation - Maintenance
**ID:** `transport.maintenance`  
**Question:** "Monthly set-aside for maintenance/repairs ($)?"  
**Type:** Currency  
**Next:** Question #4h

---

## Question #4h: Transportation - Public Transit Check
**ID:** `transport.public_transit_check`  
**Question:** "Do you use public transportation?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #4i:** Transportation - Public Transit Amount

### Branch: No
→ **Question #5:** Food - Start

---

## Question #4i: Transportation - Public Transit Amount
**ID:** `transport.public_transit_amount`  
**Question:** "Monthly public transit cost ($)?"  
**Type:** Currency  
**Next:** Question #5

---

## Question #5: Food - Start
**ID:** `food.start`  
**Question:** "Estimate your monthly groceries ($)"  
**Type:** Currency  
**Next:** Question #5a

---

## Question #5a: Food - Dining
**ID:** `food.dining`  
**Question:** "Estimate your monthly dining out/coffee ($)"  
**Type:** Currency  
**Next:** Question #6

---

## Question #6: Insurance - Start
**ID:** `insurance.start`  
**Question:** "Do you pay health insurance premiums out-of-pocket?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #6a:** Insurance - Premium Amount

### Branch: No
→ **Question #6b:** Insurance - HSA Check

---

## Question #6a: Insurance - Premium Amount
**ID:** `insurance.premium_amount`  
**Question:** "Monthly health insurance premium ($)?"  
**Type:** Currency  
**Next:** Question #6b

---

## Question #6b: Insurance - HSA Check
**ID:** `insurance.hsa_check`  
**Question:** "Do you contribute to an HSA or have regular out-of-pocket medical costs?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #6c:** Insurance - Out-of-Pocket Amount

### Branch: No
→ **Question #7:** Debt - Start

---

## Question #6c: Insurance - Out-of-Pocket Amount
**ID:** `insurance.ooP_amount`  
**Question:** "Average monthly medical/dental/vision out-of-pocket ($)?"  
**Type:** Currency  
**Next:** Question #6d

---

## Question #6d: Insurance - Life/Disability
**ID:** `insurance.life_disability`  
**Question:** "Do you pay for life or disability insurance?"  
**Type:** Multi-Select (Life insurance, Disability insurance, Neither)  
**Next:** Question #6e

---

## Question #6e: Insurance - Life/Disability Amounts
**ID:** `insurance.life_disability_amounts`  
**Question:** "Monthly premiums for selected policies ($)"  
**Type:** Table  
**Next:** Question #7

---

## Question #7: Debt - Start
**ID:** `debt.start`  
**Question:** "Do you have any of the following debts?"  
**Type:** Multi-Select (Credit cards, Student loans, Personal loans, Car loans, None)  
**Next:** Question #7a

---

## Question #7a: Debt - Amounts
**ID:** `debt.amounts`  
**Question:** "Enter monthly payments for selected debts ($)"  
**Type:** Table  
**Next:** Question #8

---

## Question #8: Savings - Start
**ID:** `savings.start`  
**Question:** "Do you currently save/invest monthly?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #8a:** Savings - Allocations

### Branch: No
→ **Question #8b:** Savings - Targets

---

## Question #8a: Savings - Allocations
**ID:** `savings.allocations`  
**Question:** "Enter monthly contributions ($)"  
**Type:** Table  
**Next:** Question #9

---

## Question #8b: Savings - Targets
**ID:** `savings.targets`  
**Question:** "Set targets for each bucket (optional)"  
**Type:** Table  
**Next:** Question #9

---

## Question #9: Personal - Start
**ID:** `personal.start`  
**Question:** "Any of these monthly lifestyle costs?"  
**Type:** Multi-Select (Gym/health, Streaming/subscriptions, Hobbies/sports, Clothing, Travel/vacations)  
**Next:** Question #9a

---

## Question #9a: Personal - Amounts
**ID:** `personal.amounts`  
**Question:** "Enter monthly amounts for selected items ($)"  
**Type:** Table  
**Next:** Question #10

---

## Question #10: Family - Start
**ID:** `family.start`  
**Question:** "Do you have childcare or kids' activity costs?"  
**Type:** Yes/No

### Branch: Yes
→ **Question #10a:** Family - Amounts

### Branch: No
→ **Question #11:** Miscellaneous - Start

---

## Question #10a: Family - Amounts
**ID:** `family.amounts`  
**Question:** "Enter monthly amounts ($)"  
**Type:** Table  
**Next:** Question #11

---

## Question #11: Miscellaneous - Start
**ID:** `misc.start`  
**Question:** "Any of these miscellaneous items?"  
**Type:** Multi-Select (Gifts, Donations/charity, Pet expenses)  
**Next:** Question #11a

---

## Question #11a: Miscellaneous - Amounts
**ID:** `misc.amounts`  
**Question:** "Enter monthly amounts for selected items ($)"  
**Type:** Table  
**Next:** Results Summary

---

## Visual Decision Tree

```
#1: Income Sources
  └─> #2: Profile - Household
      ├─> [Yes] → #2c: Dependents
      │           ├─> [Yes] → #2d: Number of Dependents → #3
      │           └─> [No] → #3
      └─> [No] → #2a: Partner
                  ├─> [Yes] → #2b: Income Split → #2c
                  └─> [No] → #2c

#3: Housing - Start
  ├─> [Rent] → #3a: Rent Amount → #3e
  ├─> [Mortgage] → #3b: Mortgage Amount → #3c: Taxes/HOA
  │                 ├─> [Yes] → #3d: Taxes/HOA Amount → #3e
  │                 └─> [No] → #3e
  └─> [Neither] → #3e: Utilities Check → #3f: Utilities Amounts → #3g: Maintenance
                    ├─> [Yes] → #3h: Maintenance Amount → #4
                    └─> [No] → #4

#4: Transportation - Start
  ├─> [Own] → #4a: Loan Payment Check
  │            ├─> [Yes] → #4b: Loan Payment → #4d
  │            └─> [No] → #4d: Insurance → #4e: Fuel Type → #4f: Fuel Amount → #4g: Maintenance → #4h
  ├─> [Lease] → #4c: Lease Payment → #4d → #4e → #4f → #4g → #4h
  └─> [No vehicle] → #4h: Public Transit Check
                      ├─> [Yes] → #4i: Public Transit Amount → #5
                      └─> [No] → #5

#5: Food - Start → #5a: Dining → #6

#6: Insurance - Start
  ├─> [Yes] → #6a: Premium Amount → #6b
  └─> [No] → #6b: HSA Check
              ├─> [Yes] → #6c: Out-of-Pocket Amount → #6d
              └─> [No] → #7
              └─> [Yes path] → #6d: Life/Disability → #6e: Life/Disability Amounts → #7

#7: Debt - Start → #7a: Debt Amounts → #8

#8: Savings - Start
  ├─> [Yes] → #8a: Allocations → #9
  └─> [No] → #8b: Targets → #9

#9: Personal - Start → #9a: Personal Amounts → #10

#10: Family - Start
  ├─> [Yes] → #10a: Family Amounts → #11
  └─> [No] → #11

#11: Miscellaneous - Start → #11a: Miscellaneous Amounts → Results Summary
```

## Question Types Summary

- **Yes/No Questions:** 12 questions with binary branching
- **Single Select Questions:** 5 questions with multiple option branches
- **Multi-Select Questions:** 5 questions that lead to table inputs
- **Currency Questions:** 15 questions for dollar amounts
- **Number Questions:** 1 question (dependents count)
- **Table Questions:** 8 questions for multiple item inputs
- **Summary Question:** 1 question (results review)

## Total Questions

- **Main Questions:** 11 (numbered #2 through #11, plus #1 for income)
- **Subquestions:** 30+ (with letter suffixes like #3a, #3b, etc.)
- **Total Questions in Flow:** ~41 questions (excluding income)

## Key Branching Points

1. **Profile Section (#2):** Branches based on household type and partner status
2. **Housing Section (#3):** Branches based on rent/mortgage/neither choice
3. **Transportation Section (#4):** Branches based on own/lease/no vehicle
4. **Insurance Section (#6):** Branches based on health insurance and HSA status
5. **Savings Section (#8):** Branches based on whether user currently saves
6. **Family Section (#10):** Branches based on childcare costs

