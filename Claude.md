

Last Updated 18/06/2026:




Tech Stack:
React - Vite build
Supabase (currently local storage)
Typescript


AI-first workspace overhauling current workflows.

Core of the app: 
1. AI-engine
2. Declarative UX
3. Object-based relational databases

User Interaction:
1. User primarily interacts with the AI using Natural language to describe desired outcome.
	1. AI builds the workspace UI for that Page.
2. User has the ability to make minor changes manually (moving items, column resizing, editing formula)

Key ideas:
- The app has declarative building. User no longer has to learn complex formulas like Excel, Notion, Coda. User describes what they want, and the AI writes the formula.
	- AI does the building that a human would nromally spend a long time trying to do.
	- The output is still the same (i.e. user can see the formula in teh column and edit it manually if they want, but someone with no formula knowledge or technical skillset could use the platformn)
- User no longer spends hours building and maintaining dashboards or building spreadsheets, they describe what they want and the AI executes and enhances the workflow.

Backbone:
- Databases hold all information.
- UX are containers that render information in a way that enhances the user experience.
	- Visual layout IS also data -> just like a DOM tree has the parent at the top. 
		- Spatial location of Block Containers is a way of communicating information and data.
		- This is also stored as part of databases.

Example of how the app can be used:
1. Agent-first approach in business. Agents for each department. E.g. marketing user requests a new proposal built. Marketing agent autonomously connects with the finance user agent. The two agents build teh plan. The plan is then taken to the Sales team agent to discuss customer execution. In the morning the human workforce can log into their account, see the proposal built by marketing agent, with input and data already provided by finance and sales agents, ready for review by human workforce.
2. Student collaboration. Student pastes their study course into the app - key dates, assignments, unit outcomes etc. the app autonomously organises and groups into the app, with a study plan, and task list auto generated. 
	a. Student pastes a topic of what they're learning, the ai engine creates well formatted learning material - markdown ascii notes, interactive html lessons that visually and spatially show concepts. Student can also take notes and convert from document mode to canvas style editing with arrows and spatial drawing to better understand concepts.
	b. Ai engine creates study prompts so coming in each day there are random questions to help with spatial repetition 
	c. user wants to replace excel for analysis and needs to have a table (database) that then is able to reference any other piece of data in the App and other databases.
	

Stage 1. Replacement app for notion, Microsoft word, excel, Obsidian to begin. Personal use.
- Declarative AI funcitonal. 
- Example Usage:
	-  User logs in -> Ai is the personal assistant. Welcomes Chris to the app, has read through his calendar and all the tasks across the workspace. Reminds Chris about upcoming deadling and suggsts tasks and next steps to complete. Has read through all teh personal notes for the past couple of days, summarised and filed them away. Has found connection between ideas from yesterday and those written 4 months ago.
Stage 2. Multi-user collaboration - AI first. 
- Connect AI Agent from user account and communicate with AI agent from another user account to work together.
	- E.g. marketing user requests a new proposal built. Marketing agent autonomously connects with the finance user agent. The two agents build teh plan. The plan is then taken to the Sales team agent to discuss customer execution. In the morning the human workforce can log into their account, see the proposal built by marketing agent, with input and data already provided by finance and sales agents, ready for review by human workforce.
	
Stage 3. All in one integration. Examples:
- Plugin for all major services. 
- The app is connected to services like Figma to draw and build presentaiton decks based on proposal.
- The in-store execution briefs are completed and submitted to 3rd-party for externally hired merchandising team to execute in-store.
- IDE integration so business proposals can be executed in codebases.
- Calendar integration. IOS shortcuts and automation integrations, to sync cross-device. App would be able to integrate so that a task generated on app is then synced with api to show up on users phone home-screen widget.



Current folder overview:
.
├── LEARNINGPLAN.md
├── ROADMAP.md
├── eslint.config.js
├── ignore-personal-references
│   ├── Vite defaultREADME.md
│   ├── cssReference.md
│   └── sidebar-v2 copy.html
├── index.html
├── package-lock.json
├── package.json
├── public
│   ├── favicon.svg
│   └── icons.svg
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components
│   │   ├── Editor.tsx
│   │   ├── editor.css
│   │   ├── footer
│   │   │   ├── Footer.tsx
│   │   │   └── footer.css
│   │   ├── header
│   │   │   ├── Header.tsx
│   │   │   └── header.css
│   │   ├── panels
│   │   │   ├── left-panel
│   │   │   │   ├── LeftPanel.tsx
│   │   │   │   └── left-panel.css
│   │   │   ├── right-panel
│   │   │   │   ├── RightPanel.tsx
│   │   │   │   └── right-panel.css
│   │   │   └── shared
│   │   │       ├── panel
│   │   │       │   ├── Panel.tsx
│   │   │       │   └── panel.css
│   │   │       ├── panel-body
│   │   │       │   ├── PanelBody.tsx
│   │   │       │   ├── PanelBodyItem.tsx
│   │   │       │   ├── panel-body-item.css
│   │   │       │   └── panel-body.css
│   │   │       ├── panel-header
│   │   │       │   ├── PanelHeader.tsx
│   │   │       │   └── panel-header.css
│   │   │       ├── panel-header-tile
│   │   │       │   ├── PanelHeaderTile.tsx
│   │   │       │   └── panel-header-tile.css
│   │   │       └── panel-toggle
│   │   │           ├── PanelToggle.tsx
│   │   │           └── panel-toggle.css
│   │   ├── store
│   │   │   └── useWorkspaceStore.tsx
│   │   ├── workspace
│   │   │   ├── WorkspaceArea.tsx
│   │   │   └── workspace.css
│   │   └── workspace-blocks
│   │       ├── CanvasArea
│   │       │   └── CanvasArea.tsx
│   │       └── ContentArea
│   │           ├── ContentArea.tsx
│   │           └── content-area.css
│   ├── draggable
│   │   ├── dragContainer
│   │   │   ├── DragContainer.tsx
│   │   │   ├── drag-container.css
│   │   │   ├── plan.excalidraw
│   │   │   └── planning.drawio
│   │   ├── dragHandle
│   │   │   ├── DragHandle.tsx
│   │   │   └── drag-handle.css
│   │   └── dragManager
│   │       └── DragManager.ts
│   ├── index.css
│   ├── main.tsx
│   ├── selection
│   │   └── selectionManager
│   │       └── SelectionManager.ts
│   ├── storage
│   │   └── useDocumentStorage.tsx
│   └── types
│       ├── registry.ts
│       └── types.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts

30 directories, 61 files



---

Project name ideas:

Delta
Delta base
BlockBase
Novus -> hmm not sure if it rolls of the tongue.

Something with the word base to signal databases.
Delta I can imagine is easy to say -> put it in delta. Get Delta to do it. Could be shortened to DB. What does db say?

HomeBase
PowerBase.
OneBase

Current front runner for name: **Novari**


**Novari** is a built name, but it is heavily rooted in real linguistic patterns. It blends two specific Latin concepts:

1. **Novus / Nova:** Meaning _new_ or _fresh start_ (the paradigm shift).
    
2. **Varius / Varia:** Meaning _diverse_, _changing_, or _flexible_ (the ultimate relational database/flexible doc engine).
    

Linguistically, it translates perfectly to **"Flexible New Era"** or **"The Dynamic Evolution."**



---

Coding standards:

1. uniform event handler callbacks used.
	- E.g. WorkspaceArea has a unifrom mouse event handler:
	- const handleMouseEvent = (mouseData: MouseEventData, trigger: string)

```code
	  //WorkspaceArea is the conduit -> Container never touches SM directly.
	  //Just forward the raw mouse data + trigger to SM's public method.
	  const handleMouseEvent = (mouseData: MouseEventData, trigger:  string) => {
	  sm.receiveMouseEvent(mouseData, trigger)
	  //redirect to the components and classes that should be told.
	  }

```
---


2. Strict types used and written in all non-obvious areas.
3. Code is optimised for readability over brevity. Use code that can be read by student and junior/dev level. The functionality must be maintained at a high level, but the writing style must be easy to follow and understand.
4. Variabe and function names should help the reader understand what the code is doing
5. Style to be included in separate styles sheet. CSS variables used to allow for updated themes in root styles.css
6. Components must have one clear responsibility. Helper classes, and ts files must be utilised to keep each file small, isolated and readable.
7. Types to be included in types.ts 

---

Next milestones:

Mostly completed 18th June
1. Operational drag and drop -> main information and features wired (excluding Collision Management)


Requirements:
- DragHandle must have all event handlers to handle mouse down, mouse up.
- 
- Event handler callbacks must come from WorkspaceArea and go through the handleMouseEvent.
- trigger words must be included e.g. "drag-handle-mouse-down"
- Workspace area requires mouseMove event (while active drag)
- Workspace Area. Drag Container, Drag Handle, Content Area NEVER make decisions on events. Event handlers are claled - workspace area is the conduit that sends the event to each of the helper classes (e.g. seleciton manager, drag manager). Every Event MUST follow the same flow, only the helper classes are responsible for deciding what to do with it.
- DragContainers must move from relative to absolute positioning. 
- TextElement.layout must be coded throughout. All information to be saved into memory along wiht the existing files and Content storage.
- Workspace Area must send boundaries to drag manager.
- Top-left positioning determines order that containers are stored in file contents. 
- Never write inline arrow functions or logic inside the JSX return.
- Event handler function calls must be handled inside the function body.

2. Migrate working code from pieces (no action now -  wait for build plan)

3. Allow for new Block creation via the BlockCreator -> various methods of creation include copy and paste, left-panel menu tile, and more to come.

4. Allow for new file creation in left-panel menu.

5. Start building database component

```Mermaid
classDiagram
    %% ====================================================
    %% TODO: Replace "TBD" with real responsibilities/state
    %% ====================================================

    class WorkspaceArea {
        Responsibilities: TBD
        Memory: TBD
    }

    class WorkspaceActionRouter {
        Responsibilities: handles user interactions
        Memory: TBD
    }

    class DragContainer {
        Responsibilities: TBD
        Memory: layoutData
        Memory: dragContainerProps
    }

    class DragHandle {
        Responsibilities: TBD
        Memory: TBD
    }

    class DragManager {
        Responsibilities: TBD
        Memory: TBD
    }

    class ContentArea {
        Responsibilities: TBD
        Memory: TextElement
    }

    class File {
        Responsibilities: TBD
        Memory: TBD
    }

    class Search {
        Responsibilities: TBD
        Memory: TBD
    }

    class VersionControl {
        Responsibilities: TBD
        Memory: TBD
    }

    class PermissionManager {
        Responsibilities: TBD
        Memory: TBD
    }

    class CollisionManager {
        Responsibilities: TBD
        Memory: TBD
    }

    class BlockCreator {
        Responsibilities: TBD
        Memory: TBD
    }

    class Clipboard {
        Responsibilities: TBD
        Memory: TBD
    }

    class SelectionManager {
        Responsibilities: TBD
        Memory: TBD
    }

    %% ====================================================
    %% Relationships visible from your Figma diagram
    %% Add more as you map them out
    %% ====================================================
    WorkspaceArea *-- DragContainer
    WorkspaceArea *-- ContentArea
    DragContainer *-- ContentArea
    DragContainer --> DragHandle