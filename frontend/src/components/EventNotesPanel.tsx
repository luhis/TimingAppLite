import { useState } from "react";
import { Box, Button, Content, Heading } from "react-bulma-components";

type EventNotesPanelProps = {
  readonly notes: string;
};

export const EventNotesPanel = ({ notes }: EventNotesPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!notes.trim()) {
    return null;
  }

  return (
    <Box>
      <div className="is-flex is-justify-content-space-between is-align-items-center">
        <Heading renderAs="h3" size={5} className="mb-0">
          Event Notes
        </Heading>
        <Button
          color="ghost"
          size="small"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide" : "Show"}
        </Button>
      </div>
      {expanded && (
        <Content className="mt-4">
          <p style={{ whiteSpace: "pre-wrap" }}>{notes}</p>
        </Content>
      )}
    </Box>
  );
};
