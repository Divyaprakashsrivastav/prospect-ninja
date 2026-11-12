import type { ProviderProspectRecord } from "@/modules/discovery/types";

type Seed = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  industry: string;
  location: string;
  companySize: string;
  summary: string;
};

const SEEDS: Seed[] = [
  { id: "demo-01", firstName: "Amina", lastName: "Cole", jobTitle: "CEO", company: "Lumen SaaS Labs", industry: "SaaS", location: "Sydney, Australia", companySize: "11-50", summary: "Leads a B2B subscription platform for operations teams." },
  { id: "demo-02", firstName: "Hugo", lastName: "Bennett", jobTitle: "Founder", company: "Outpost Software", industry: "SaaS", location: "Melbourne, Australia", companySize: "1-10", summary: "Founded a workflow product for professional services." },
  { id: "demo-03", firstName: "Priya", lastName: "Shah", jobTitle: "CTO", company: "Nimbus Cloud Co", industry: "IT Services", location: "Austin, United States", companySize: "51-200", summary: "Owns engineering for a managed cloud practice." },
  { id: "demo-04", firstName: "Elena", lastName: "Ward", jobTitle: "Marketing Director", company: "Harbor Fintech", industry: "FinTech", location: "London, United Kingdom", companySize: "51-200", summary: "Runs demand generation for a payments product." },
  { id: "demo-05", firstName: "Marcus", lastName: "Adeyemi", jobTitle: "CEO", company: "Cedar Clinics Group", industry: "Healthcare", location: "Manchester, United Kingdom", companySize: "201-500", summary: "Leads a network of outpatient clinics." },
  { id: "demo-06", firstName: "Sofia", lastName: "Nguyen", jobTitle: "Founder", company: "PixelForge Studio", industry: "Marketing", location: "San Francisco, United States", companySize: "11-50", summary: "Builds brand systems for B2B software companies." },
  { id: "demo-07", firstName: "Jonah", lastName: "Reid", jobTitle: "CTO", company: "Orbit Payments", industry: "FinTech", location: "New York, United States", companySize: "51-200", summary: "Heads product engineering for merchant payouts." },
  { id: "demo-08", firstName: "Lara", lastName: "Singh", jobTitle: "Head of Revenue Operations", company: "Northwind Analytics", industry: "SaaS", location: "Brisbane, Australia", companySize: "11-50", summary: "Owns forecasting and pipeline operations." },
  { id: "demo-09", firstName: "Owen", lastName: "Brooks", jobTitle: "VP of Sales", company: "Summit Capital Tech", industry: "Finance", location: "Boston, United States", companySize: "201-500", summary: "Leads enterprise sales for a research platform." },
  { id: "demo-10", firstName: "Mira", lastName: "Patel", jobTitle: "Marketing Director", company: "Helios Cloud", industry: "SaaS", location: "Chicago, United States", companySize: "51-200", summary: "Directs product marketing for infrastructure software." },
  { id: "demo-11", firstName: "Theo", lastName: "Laurent", jobTitle: "Founder", company: "Atelier Health", industry: "Healthcare", location: "Paris, France", companySize: "1-10", summary: "Started a care-coordination tool for clinics." },
  { id: "demo-12", firstName: "Grace", lastName: "Kim", jobTitle: "Demand Generation Manager", company: "Lantern Analytics", industry: "SaaS", location: "Seattle, United States", companySize: "11-50", summary: "Runs inbound campaigns for analytics buyers." },
  { id: "demo-13", firstName: "Daniel", lastName: "Wright", jobTitle: "IT Director", company: "Meridian Manufacturing", industry: "Manufacturing", location: "Detroit, United States", companySize: "501+", summary: "Manages plant IT and vendor systems." },
  { id: "demo-14", firstName: "Yuki", lastName: "Tanaka", jobTitle: "Growth Lead", company: "Kite Mobile", industry: "Mobile", location: "Tokyo, Japan", companySize: "11-50", summary: "Owns acquisition for a productivity app." },
  { id: "demo-15", firstName: "Claire", lastName: "Dubois", jobTitle: "Head of Talent", company: "Atelier Studio", industry: "Design", location: "Lyon, France", companySize: "11-50", summary: "Builds hiring programs for a design consultancy." },
  { id: "demo-16", firstName: "Noah", lastName: "Okoye", jobTitle: "CEO", company: "Palm Education", industry: "Education", location: "Lagos, Nigeria", companySize: "51-200", summary: "Leads a professional learning company." },
  { id: "demo-17", firstName: "Hannah", lastName: "Scott", jobTitle: "Account Executive", company: "Clearview CRM", industry: "SaaS", location: "Atlanta, United States", companySize: "51-200", summary: "Sells CRM seats to mid-market teams." },
  { id: "demo-18", firstName: "Ivan", lastName: "Petrov", jobTitle: "Procurement Manager", company: "Baltic Freight", industry: "Logistics", location: "Helsinki, Finland", companySize: "201-500", summary: "Buys software for a freight network." },
  { id: "demo-19", firstName: "Natalie", lastName: "Brown", jobTitle: "VP of Customer Success", company: "Fjord Software", industry: "SaaS", location: "Copenhagen, Denmark", companySize: "51-200", summary: "Owns retention for a European SaaS product." },
  { id: "demo-20", firstName: "James", lastName: "Okonkwo", jobTitle: "VP of Sales", company: "Harbor Logistics", industry: "Logistics", location: "Chicago, United States", companySize: "201-500", summary: "Leads regional freight sales." },
  { id: "demo-21", firstName: "Leila", lastName: "Farouk", jobTitle: "Chief Marketing Officer", company: "Sahara Labs", industry: "SaaS", location: "Dubai, UAE", companySize: "11-50", summary: "Sets marketing strategy for a data product." },
  { id: "demo-22", firstName: "Thomas", lastName: "Nguyen", jobTitle: "Customer Experience Lead", company: "Riverbank Insurance", industry: "Insurance", location: "Denver, United States", companySize: "201-500", summary: "Improves policyholder support journeys." },
  { id: "demo-23", firstName: "Anna", lastName: "Kowalska", jobTitle: "Business Development Manager", company: "Baltic Software", industry: "IT Services", location: "Warsaw, Poland", companySize: "51-200", summary: "Partners with manufacturers on IT projects." },
  { id: "demo-24", firstName: "Samuel", lastName: "Adebayo", jobTitle: "Founder", company: "Savanna Health", industry: "Healthcare", location: "Accra, Ghana", companySize: "1-10", summary: "Building clinic software for emerging markets." },
  { id: "demo-25", firstName: "Isla", lastName: "Murray", jobTitle: "CTO", company: "Coral Payments", industry: "FinTech", location: "Auckland, New Zealand", companySize: "11-50", summary: "Leads engineering for a payouts API." },
  { id: "demo-26", firstName: "Ben", lastName: "Carter", jobTitle: "Marketing Director", company: "Oak & Iron SaaS", industry: "SaaS", location: "Manchester, United Kingdom", companySize: "11-50", summary: "Owns content and pipeline for a UK SaaS firm." },
  { id: "demo-27", firstName: "Fatima", lastName: "Hassan", jobTitle: "CEO", company: "Qamar Analytics", industry: "SaaS", location: "Perth, Australia", companySize: "1-10", summary: "Runs a small analytics company for retailers." },
  { id: "demo-28", firstName: "Lucas", lastName: "Meier", jobTitle: "Founder", company: "Leaf Commerce", industry: "E-commerce", location: "Berlin, Germany", companySize: "11-50", summary: "Founded a storefront operations product." },
  { id: "demo-29", firstName: "Riley", lastName: "Chen", jobTitle: "Sales Enablement Lead", company: "Helix IT Services", industry: "IT Services", location: "Toronto, Canada", companySize: "51-200", summary: "Trains sales teams at a services firm." },
  { id: "demo-30", firstName: "Maya", lastName: "Fernandez", jobTitle: "Operations Manager", company: "Pacific Clinics", industry: "Healthcare", location: "Adelaide, Australia", companySize: "51-200", summary: "Runs day-to-day clinic operations." },
  { id: "demo-31", firstName: "Arthur", lastName: "Collins", jobTitle: "CEO", company: "Northshore FinTech", industry: "FinTech", location: "Edinburgh, United Kingdom", companySize: "11-50", summary: "Leads a lending-ops software company." },
  { id: "demo-32", firstName: "Nina", lastName: "Volkov", jobTitle: "Product Marketing Manager", company: "Clearpath SaaS", industry: "SaaS", location: "Los Angeles, United States", companySize: "51-200", summary: "Positions a collaboration product for SMBs." },
];

export const DEMO_CATALOG: ProviderProspectRecord[] = SEEDS.map((seed) => ({
  provider: "demo",
  providerProspectId: seed.id,
  firstName: seed.firstName,
  lastName: seed.lastName,
  jobTitle: seed.jobTitle,
  company: seed.company,
  industry: seed.industry,
  location: seed.location,
  companySize: seed.companySize,
  professionalSummary: `DEMO DATA — synthetic sample, not a real LinkedIn user. ${seed.summary}`,
  profileUrl: `https://demo.outreach-studio.invalid/prospects/${seed.id}`,
  isDemo: true,
}));
