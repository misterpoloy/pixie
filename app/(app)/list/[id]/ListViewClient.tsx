"use client";

import TaskList from "@/components/tasks/TaskList";
import AddTaskInline from "@/components/tasks/AddTaskInline";

interface List {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  type: "list" | "project" | "inbox";
}

interface Section {
  id: string;
  name: string;
  collapsed: boolean;
  sortOrder: number;
}

interface Props {
  list: List;
  sections: Section[];
}

export default function ListViewClient({ list, sections }: Props) {
  if (list.type === "list" || sections.length === 0) {
    // Flat list
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{
            width: 14, height: 14, borderRadius: "50%",
            background: list.color, flexShrink: 0,
            boxShadow: `0 0 10px ${list.color}66`,
          }} />
          <h1 className="page-title" style={{ margin: 0 }}>{list.name}</h1>
        </div>
        {list.description && <p className="page-subtitle">{list.description}</p>}

        <TaskList
          apiUrl={`/api/tasks?listId=${list.id}&parentId=null`}
          addDefaults={{ listId: list.id }}
          emptyMessage="No tasks yet — add one below"
        />
      </>
    );
  }

  // Project with sections
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          background: list.color, flexShrink: 0,
        }} />
        <h1 className="page-title" style={{ margin: 0 }}>{list.name}</h1>
      </div>
      {list.description && <p className="page-subtitle">{list.description}</p>}

      {sections.map((section) => (
        <div key={section.id} style={{ marginBottom: 24 }}>
          <div className="section-header">
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: list.color,
            }} />
            {section.name}
          </div>
          <TaskList
            apiUrl={`/api/tasks?listId=${list.id}&sectionId=${section.id}&parentId=null`}
            addDefaults={{ listId: list.id, sectionId: section.id }}
            showAdd
            emptyMessage=""
          />
        </div>
      ))}

      {/* Unsectioned tasks */}
      <div>
        <div className="section-header">
          <span>…</span> No section
        </div>
        <TaskList
          apiUrl={`/api/tasks?listId=${list.id}&parentId=null`}
          addDefaults={{ listId: list.id }}
          showAdd
          emptyMessage=""
        />
      </div>
    </>
  );
}
