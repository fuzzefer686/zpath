export const mockTallyPayload = {
  eventId: "mock-tally-event-001",
  eventType: "FORM_RESPONSE",
  data: {
    responseId: "mock-tally-response-001",
    fields: [
      {
        key: "technology_interest",
        label: "technology_interest",
        value: 9,
      },
      {
        key: "business_interest",
        label: "business_interest",
        value: 7,
      },
      {
        key: "design_media_interest",
        label: "design_media_interest",
        value: 5,
      },
      {
        key: "healthcare_interest",
        label: "healthcare_interest",
        value: 2,
      },
      {
        key: "math_logic_ability",
        label: "math_logic_ability",
        value: 8,
      },
      {
        key: "english_ability",
        label: "english_ability",
        value: 7,
      },
      {
        key: "self_learning_ability",
        label: "self_learning_ability",
        value: 8,
      },
      {
        key: "problem_solving_preference",
        label: "problem_solving_preference",
        value: 9,
      },
      {
        key: "communication_teamwork_preference",
        label: "communication_teamwork_preference",
        value: 6,
      },
      {
        key: "persistence_level",
        label: "persistence_level",
        value: 8,
      },
      {
        key: "has_laptop",
        label: "has_laptop",
        value: "Có",
      },
      {
        key: "self_study_time_per_day",
        label: "self_study_time_per_day",
        value: "1 – 2 giờ",
      },
      {
        key: "income_priority",
        label: "income_priority",
        value: 8,
      },
      {
        key: "stability_priority",
        label: "stability_priority",
        value: 6,
      },
      {
        key: "action_readiness_experience",
        label: "action_readiness_experience",
        value: "Đã làm project nhỏ",
      },
    ],
    hiddenFields: {
      session_id: "test-session-123",
      source: "zpath",
      student_ref: "guest",
    },
  },
};

/*
Manual local test only. Do not run automatically.

1. Start the app:
   npm run dev

2. In another terminal, POST this mock payload:
   npx tsx -e "import { mockTallyPayload } from './src/lib/forms/mockTallyPayload'; fetch('http://localhost:3001/api/webhooks/tally', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mockTallyPayload) }).then(async (res) => { console.log(res.status); console.log(await res.text()); });"
*/
