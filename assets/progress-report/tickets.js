window.ticketsData = [
  // rc.pul.45
  { parent: "PUL-1023", idea:"PL-11", desc: "Adds staff leave and calendar capabilities to the client portal's My Team section. Clients can view the leave calendar, see pending and processed leave requests, and approve or decline requests. Access to each capability is controlled by dedicated permission nodes." },
  { parent: "PUL-1311", idea:"PL-11", desc: "Covers the leave approval workflow within the Phase 3.1 Staff Leave & Calendar feature — allowing clients to approve and decline leave requests submitted by their staff." },
  { parent: "PUL-1310", idea:"PL-11", desc: "Tracks bugs and enhancements identified during the Phase 3.1 Staff Leave & Calendar rollout." },

  // rc.pul-dev
  { parent: "PUL-1143", idea:"PL-50", desc: "Adds a Salary Reviews report for the CS team, surfacing delivery staff who are 11+ months since their last salary increase. CS staff see only their own clients; CS Managers and Admins see all records. The report supports inline status tracking (Contacted, Follow Up, Approved, Denied), an expanded row with log notes and status history, and auto-escalation from Contacted to Follow Up after 14 days." },
  
  // rc.pls-dev
  { parent: "PLS-2015", idea:"", desc: "Enhancements and fixes identified during the Sprout Integration beta test phase." },

  // rc.pls.52
  { parent: "PLS-890", idea:"", desc: "Adds a support ticket view page and conversation feature to Pulse, enabling staff to view ticket details and communicate through a threaded conversation interface." },
  { parent: "PLS-1995", idea:"", desc: "Tracks bugs identified during the rc.52 release cycle." },
  { parent: "PLS-2121", idea:"", desc: "Umbrella epic for rc.52 tech debt cleanup, performance optimizations, and general housekeeping tasks." },
  
  // rc.pul.52
  { parent: "PUL-1358", idea:"", desc: "Fixes data issues in the Key Updates report: Vietnam showing 0 staff due to inconsistent country naming (\"Viet Nam\" vs \"Vietnam\"), and staff with no country on record being dropped from country cards instead of grouped under \"Other\". Ensures the country filter never errors and that Global total always equals the sum of all country cards." },
  { parent: "PUL-1268", idea:"", desc: "Bug where the Manager field is nulled out when the selected manager shares a name with an existing Reports To entry. Fixes by adding on-change validation to prevent Manager and Reports To from referencing the same person, with inline error messages for each case." },
  { parent: "PUL-1388", idea:"", desc: "Bug where daily and hourly charge-out rates in the Staff Margin report are displayed as-quoted instead of converted to a monthly equivalent. Fixes both Charge Out columns to always show monthly amounts (Daily × 20, Hourly × 160) so the on-screen figures match the margin calculation." },
  { parent: "PUL-1287", idea:"", desc: "Adds an \"Excluding upgrades\" dropdown to the Staff Margin report (default) that deducts work-setup upgrade costs from gross margin: Home = $0, Hybrid = -AU$200, Office = -AU$300. Column headings update accordingly when the option is selected." },
  { parent: "PUL-1326", idea:"", desc: "Adds an \"Upload Contacts\" recipient option to Newsfeed, letting admins upload a spreadsheet of email addresses (e.g. from an RSVP survey) that gets matched to staff profiles and populates the recipient list — replacing the workaround of sending targeted event messages via Gmail." },
  { parent: "PUL-1263", idea:"", desc: "Splits the combined salary-and-currency column in the staff export into two separate columns — Gross Salary and Currency — to support multi-country staff across six regions." },
  { parent: "PUL-1414", idea:"", desc: "Converts previously hard-mandatory staff fields to soft-required: the asterisk and label remain, but saving is not blocked — a warning-styled validation message is shown instead of an error, allowing data entry to proceed even when not all information is available." },
  { parent: "PUL-1316", idea:"", desc: "Updates the Key Updates report to include non-employee staff types in the staff count figures." },  
  { parent: "PUL-1389", idea:"", desc: "UI update for the Key Updates report: removes the light blue background, adds a bold Total row, shows only totals by default, and expands to show a breakdown (Employees, Consultants, Trainees, No Type) on click." },
  { parent: "PUL-1401", idea:"", desc: "Reduces the one-time reward points for a successful profile photo upload from 20 points to 10 points." },
  { parent: "PUL-1178", idea:"", desc: "Adds a Forecasted Starters report for CS/CX showing candidates who have received a job offer, listing staff name and job title per client — replacing the existing manual CX spreadsheet." },
  { parent: "PUL-1226", idea:"", desc: "Splits the single \"Unassigned\" grouping in the Growth by Sales Agent report into two distinct lines: \"Unassigned\" for staff with no assigned sales agent, and \"Former Staff\" for staff whose assigned sales agent is no longer active." },
  { parent: "PUL-1292", idea:"", desc: "Umbrella epic for rc.pul.52 tech debt cleanup, performance optimizations, and general housekeeping tasks." },

  // rc.pul-dev.
  { parent: "PUL-1138", idea:"", desc: "Builds a Staff Performance Review module in Pulse, allowing clients to conduct structured evaluations for their staff via My Team > Reviews. The dashboard shows upcoming reviews (within 2 months) and completed ones, with status transitions from Being Self Assessed to Needs Your Assessment to Overdue. Staff can optionally complete a self-assessment and view the client's completed assessment of them." },

  // rc.pul-dev
  { parent: "PUL-1112", idea:"", desc: "Introduces a \"Personal\" top-nav section and tailors the navigation experience based on whether the logged-in staff member is an Employee or Contractor. Employees get Time Off, Timesheets, and Payslips sub-sections; Contractors get Availability, Invoice, and Invoice History — with terminology adjusted throughout to reflect independent contractor status." },
  { parent: "PUL-1192", idea:"", desc: "Discovery and preparation work for the contractor service logs, time-tracking, and invoicing feature in Pulse. Covers workshops with HR and regional process owners to document current workflows (Fixed and Pay-as-you-go contractor types), and consolidates decisions and open items to inform the Pulse design." },
  { parent: "PUL-1224", idea:"", desc: "Updates leave and time-off request text across the platform to comply with New Markets legal and compliance requirements." },  

  // moved
  //{ parent: "PUL-1227", idea:"", desc: "Renames all instances of \"CS/CX\" and \"CSO/CXO\" labels across the site to \"CS\"." },
  //{ parent: "PUL-1286", idea:"", desc: "Adds a Termination Reason field to staff records with a structured set of reason options, and a new Termination Reason report with two views: high-level by Key Driver and detailed by Reason Detail, each showing this month and last 12 months." },  
];
