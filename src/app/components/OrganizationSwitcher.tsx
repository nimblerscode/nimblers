// "use client";

// import { switchActiveOrganization } from "@/app/actions/organization/create"; // Import the server action
// import type React from "react";
// import { useState, useTransition } from "react";

// // Define the expected shape of an organization object
// type OrganizationInfo = {
//   organizationId: string;
//   name: string | null;
//   slug: string;
// };

// interface OrganizationSwitcherProps {
//   organizations: OrganizationInfo[];
//   activeOrganizationId: string | null;
//   userId: string; // Needed for the action, although action gets it from context now
// }

// export default function OrganizationSwitcher({
//   organizations,
//   activeOrganizationId,
//   userId, // Keep userId prop for clarity, even if action re-verifies
// }: OrganizationSwitcherProps) {
//   const [isPending, startTransition] = useTransition();
//   const [feedback, setFeedback] = useState<string | null>(null);

//   // Handle dropdown change
//   const handleSwitchOrganization = async (
//     event: React.ChangeEvent<HTMLSelectElement>,
//   ) => {
//     const newOrgId = event.target.value;
//     setFeedback(null); // Clear previous feedback

//     if (!newOrgId || newOrgId === activeOrganizationId) {
//       return; // No change or invalid selection
//     }

//     startTransition(async () => {
//       try {
//         console.log(`Client: Attempting to switch to org ${newOrgId}`);
//         const result = await switchActiveOrganization(newOrgId);

//         if (result.success) {
//           setFeedback("Switched successfully! Redirecting...");

//           // Find the matching organization in the prop array to get its slug
//           const selectedOrg = organizations.find(
//             (org) => org.organizationId === newOrgId,
//           );

//           if (selectedOrg) {
//             // Redirect to the manage page using the slug
//             console.log(
//               `Client: Switch successful. Redirecting to /${selectedOrg.slug}/manage...`,
//             );
//             window.location.href = `/${selectedOrg.slug}/manage`;
//           } else {
//             // Fallback if the selected org isn't found locally (shouldn't normally happen)
//             console.warn(
//               `Client: Org ${newOrgId} switched successfully but not found in local list. Reloading page as fallback.`,
//             );
//             window.location.reload();
//           }
//         } else {
//           console.error("Client: Switch failed", result.message, result.error);
//           setFeedback(`Error: ${result.message}`);
//         }
//       } catch (error) {
//         console.error("Client: Unexpected error during switch:", error);
//         setFeedback("An unexpected error occurred.");
//       }
//     });
//   };

//   return (
//     <div>
//       <label htmlFor="organization-select">Active Organization: </label>
//       <select
//         id="organization-select"
//         value={activeOrganizationId || ""} // Handle null case
//         onChange={handleSwitchOrganization}
//         disabled={isPending}
//         style={{ marginRight: "10px" }}
//       >
//         <option value="" disabled>
//           Select an organization
//         </option>
//         {organizations.map(({ organizationId, name, slug }) => (
//           <option key={organizationId} value={organizationId}>
//             {name || slug} {/* Display name or slug */}
//           </option>
//         ))}
//       </select>
//       {isPending && <span> Switching...</span>}
//       {feedback && (
//         <p
//           style={{
//             color: feedback.startsWith("Error") ? "red" : "green",
//             marginTop: "5px",
//           }}
//         >
//           {feedback}
//         </p>
//       )}
//     </div>
//   );
// }
