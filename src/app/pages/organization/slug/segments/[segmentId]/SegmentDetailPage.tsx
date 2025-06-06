import { getSegments } from "@/app/actions/segments/list";
import { SegmentDetailClient } from "./SegmentDetailClient";

interface SegmentDetailPageProps {
  params: {
    orgSlug: string;
    segmentId: string;
  };
}

export default async function SegmentDetailPage({ params }: SegmentDetailPageProps) {
  // Fetch segments to find the specific one
  const { segments } = await getSegments(params.orgSlug);
  const segment = segments.find((s) => s.id === params.segmentId);

  if (!segment) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Segment Not Found</h1>
        <p>The segment you're looking for could not be found.</p>
        <a href={`/organization/${params.orgSlug}/segments`}>
          ← Back to Segments
        </a>
      </div>
    );
  }

  // Ensure data is properly serialized for client components
  const serializedSegment = JSON.parse(JSON.stringify(segment));

  return (
    <SegmentDetailClient
      segment={serializedSegment}
      organizationSlug={params.orgSlug}
    />
  );
} 
