import template from "./room.html?raw";

import {
    createTopBar
} from "../../components/TopBar/TopBar.js";

import {
    createChatPanel
} from "../../components/ChatPanel/ChatPanel.js";

import {
    createParticipantPanel
} from "../../components/ParticipantPanel/ParticipantPanel.js";

import {
    createActivityPanel
} from "../../components/ActivityPanel/ActivityPanel.js";

import {
    createBottomControls
} from "../../components/BottomControls/BottomControls.js";

import {
    createSettingsPanel
} from "../../components/SettingsPanel/SettingsPanel.js";

export function createRoomPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const topBar = createTopBar();
    const chatPanel = createChatPanel();
    const participantPanel = createParticipantPanel();
    const activityPanel = createActivityPanel();
    const bottomControls = createBottomControls();
    const settingsPanel = createSettingsPanel();

    element.querySelector("#topBarMount").appendChild(topBar.element);
    element.querySelector("#chatPanelMount").appendChild(chatPanel.element);
    element.querySelector("#participantPanelMount").appendChild(participantPanel.element);
    element.querySelector("#activityPanelMount").appendChild(activityPanel.element);
    element.querySelector("#bottomControlsMount").appendChild(bottomControls.element);
    element.appendChild(settingsPanel.element);

    const refs = {
        sidePanel: element.querySelector("#sidePanel"),
        presentingBanner: element.querySelector("#presentingBanner")
    };

    bindTabs(element, refs.sidePanel);

    bottomControls.onOpenChat(() => {
        activatePanel(element, "chat");
        refs.sidePanel.classList.add("is-open");
    });

    bottomControls.onOpenParticipants(() => {
        activatePanel(element, "participants");
        refs.sidePanel.classList.add("is-open");
    });

    bottomControls.onOpenSettings(async () => {
        await settingsPanel.open();
    });

    return {
        element,
        show: () => element.classList.remove("is-hidden"),
        hide: () => element.classList.add("is-hidden"),
        showEmptyStates: () => {
            chatPanel.showEmpty();
            participantPanel.showEmpty();
            activityPanel.showEmpty();
        },
        setCurrentRoom: topBar.setRoomId,
        getCurrentRoom: topBar.getRoomId,
        setMeetingStatus: topBar.setStatus,
        setHostName: topBar.setHostName,
        getHostName: topBar.getHostName,
        setHostControlsVisible: bottomControls.setHostControlsVisible,
        setMuteState: bottomControls.setMuteState,
        setCameraState: bottomControls.setCameraState,
        setHandRaised: bottomControls.setHandRaised,
        getChatText: chatPanel.getText,
        clearChatText: chatPanel.clear,
        addChatMessage: chatPanel.addMessage,
        renderParticipants: participantPanel.render,
        renderActivity: activityPanel.render,
        log: activityPanel.log,
        showPresenting: message => {
            refs.presentingBanner.textContent = message;
            refs.presentingBanner.classList.remove("is-hidden");
        },
        hidePresenting: () => {
            refs.presentingBanner.classList.add("is-hidden");
            element.querySelectorAll(".video-tile").forEach(tile => {
                tile.classList.remove("is-presenting");
            });
        },
        setLocalPresenting: isPresenting => {
            element
                .querySelector("#localVideoTile")
                ?.classList.toggle("is-presenting", isPresenting);
        },
        onSendChat: chatPanel.onSend,
        onLeave: bottomControls.onLeave,
        onEndMeeting: bottomControls.onEndMeeting,
        onMuteAll: bottomControls.onMuteAll,
        onToggleMicrophone: bottomControls.onToggleMicrophone,
        onToggleCamera: bottomControls.onToggleCamera,
        onShareScreen: bottomControls.onShareScreen,
        onRaiseHand: bottomControls.onRaiseHand
    };

}

function bindTabs(element, sidePanel) {

    element.querySelectorAll("[data-panel]").forEach(button => {
        button.addEventListener("click", () => {
            activatePanel(element, button.dataset.panel);
            sidePanel.classList.add("is-open");
        });
    });

}

function activatePanel(element, panel) {

    element.querySelectorAll("[data-panel]").forEach(button => {
        const isActive = button.dataset.panel === panel;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    element.querySelectorAll("[data-panel-view]").forEach(view => {
        view.classList.toggle("is-active", view.dataset.panelView === panel);
    });

}
