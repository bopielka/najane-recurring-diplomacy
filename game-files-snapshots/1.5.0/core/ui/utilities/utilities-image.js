import { ComponentID } from './utilities-component-id.js';

var Icon;
((Icon2) => {
  function missingUnitImage() {
    return "unitflag_missingicon.png";
  }
  Icon2.missingUnitImage = missingUnitImage;
  function getUnitIconFromID(componentID) {
    const missingIcon = Icon2.missingUnitImage();
    const unit = Units.get(componentID);
    if (!unit) {
      console.error("Failed attempt to get a unit icon for unit cid: ", ComponentID.toLogString(componentID));
      return missingIcon;
    }
    const unitDefinition = GameInfo.Units.lookup(unit.type);
    if (!unitDefinition) {
      console.error(
        "Cannot get a unit icon due to a missing Unit Definition. type: ",
        unit.type,
        "  cid: ",
        ComponentID.toLogString(componentID)
      );
      return missingIcon;
    }
    const iconURL = UI.getIconURL(unitDefinition.UnitType, "UNIT_FLAG");
    return iconURL;
  }
  Icon2.getUnitIconFromID = getUnitIconFromID;
  function getUnitIconFromDefinition(unitDefinition) {
    if (!unitDefinition) {
      console.error("Cannot get a unit icon due to a missing Unit Definition.");
      return Icon2.missingUnitImage();
    }
    const iconURL = UI.getIconURL(unitDefinition.UnitType, "UNIT_FLAG");
    return iconURL;
  }
  Icon2.getUnitIconFromDefinition = getUnitIconFromDefinition;
  function getBuildingIconFromDefinition(buildingDefinition) {
    const iconURL = UI.getIconURL(buildingDefinition.ConstructibleType, "BUILDING");
    return iconURL;
  }
  Icon2.getBuildingIconFromDefinition = getBuildingIconFromDefinition;
  function getConstructibleIconFromDefinition(constructibleDefinition) {
    const iconURL = UI.getIconURL(
      constructibleDefinition.ConstructibleType,
      constructibleDefinition.ConstructibleClass
    );
    return iconURL;
  }
  Icon2.getConstructibleIconFromDefinition = getConstructibleIconFromDefinition;
  function getTraditionIconFromDefinition(traditionDefinition) {
    const iconURL = UI.getIconURL(traditionDefinition.TraditionType, "TRADITION");
    return iconURL;
  }
  Icon2.getTraditionIconFromDefinition = getTraditionIconFromDefinition;
  function getModifierIconFromDefinition(modifierDefinition) {
    const iconURL = UI.getIconURL(modifierDefinition.ModifierType);
    return iconURL;
  }
  Icon2.getModifierIconFromDefinition = getModifierIconFromDefinition;
  function getProjectIconFromDefinition(projectDefinition) {
    const iconURL = UI.getIconURL(projectDefinition.ProjectType, "PROJECT");
    return iconURL;
  }
  Icon2.getProjectIconFromDefinition = getProjectIconFromDefinition;
  function getImprovementIconFromDefinition(improvementDefinition) {
    return UI.getIconURL(improvementDefinition.ConstructibleType, "IMPROVEMENT");
  }
  Icon2.getImprovementIconFromDefinition = getImprovementIconFromDefinition;
  function getWonderIconFromDefinition(wonderDefinition) {
    return UI.getIconURL(wonderDefinition.ConstructibleType, "WONDER");
  }
  Icon2.getWonderIconFromDefinition = getWonderIconFromDefinition;
  function getTechIconFromProgressionTreeNodeDefinition(_techDefinition) {
    const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(
      _techDefinition.ProgressionTreeNodeType
    );
    if (nodeInfo) {
      return `blp:${nodeInfo.IconString}`;
    } else {
      return "blp:unknown_complete";
    }
  }
  Icon2.getTechIconFromProgressionTreeNodeDefinition = getTechIconFromProgressionTreeNodeDefinition;
  function getCultureIconFromProgressionTreeNodeDefinition(_cultureDefinition) {
    const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(
      _cultureDefinition.ProgressionTreeNodeType
    );
    if (nodeInfo) {
      if (nodeInfo.CivInjectedIcon) {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
          const civType = GameInfo.Civilizations.lookup(player.civilizationType)?.CivilizationType;
          if (civType) {
            const iconName = civType.toString().replace("CIVILIZATION_", "cult_").toLowerCase();
            return `fs://game/${iconName}`;
          }
        }
      }
      if (nodeInfo.IconString) {
        return `blp:${nodeInfo.IconString}`;
      }
    }
    return "blp:unknown_complete";
  }
  Icon2.getCultureIconFromProgressionTreeNodeDefinition = getCultureIconFromProgressionTreeNodeDefinition;
  function getCultureIconFromProgressionTreeDefinition(_cultureDefinition) {
    const icon = _cultureDefinition.IconString;
    if (icon) {
      return `blp:${icon}`;
    } else {
      return "blp:unknown_complete";
    }
  }
  Icon2.getCultureIconFromProgressionTreeDefinition = getCultureIconFromProgressionTreeDefinition;
  function getDiplomaticActionIconFromDefinition(diploActionInfo) {
    return diploActionInfo.UIIconPath;
  }
  Icon2.getDiplomaticActionIconFromDefinition = getDiplomaticActionIconFromDefinition;
  function getYieldIcon(yieldType, bLocal = true) {
    let icon = "";
    const yieldDefinition = GameInfo.Yields.lookup(yieldType);
    if (yieldDefinition) {
      icon = UI.getIconURL(yieldDefinition.YieldType, bLocal ? "YIELD" : "YIELD_G");
    }
    if (icon) {
      return icon;
    } else {
      return "blp:unknown_complete";
    }
  }
  Icon2.getYieldIcon = getYieldIcon;
  function getProductionIconFromHash(hash) {
    const unitDefinition = GameInfo.Units.lookup(hash);
    if (unitDefinition) {
      return getUnitIconFromDefinition(unitDefinition);
    }
    const buildingDefinition = GameInfo.Buildings.lookup(hash);
    if (buildingDefinition) {
      return getBuildingIconFromDefinition(buildingDefinition);
    }
    const projectDefinition = GameInfo.Projects.lookup(hash);
    if (projectDefinition) {
      return getProjectIconFromDefinition(projectDefinition);
    }
    const improvementDefinition = GameInfo.Improvements.lookup(hash);
    if (improvementDefinition) {
      return getImprovementIconFromDefinition(improvementDefinition);
    }
    const wonderDefinition = GameInfo.Wonders.lookup(hash);
    if (wonderDefinition) {
      return getWonderIconFromDefinition(wonderDefinition);
    }
    return Icon2.missingUnitImage();
  }
  Icon2.getProductionIconFromHash = getProductionIconFromHash;
  function getLeaderPortraitIcon(leaderType, size, relationship) {
    const missingIcon = "blp:leader_portrait_unknown";
    const leader = GameInfo.Leaders.lookup(leaderType);
    if (!leader) {
      console.error("Failed attempt to get a leader icon for leaderType: ", leaderType.toString());
      console.trace();
      return missingIcon;
    }
    const sizeSuffix = size == void 0 ? "" : "_" + size.toString();
    let relationshipSuffix = "";
    if (relationship) {
      switch (relationship) {
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
          relationshipSuffix = "_a";
          break;
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
          relationshipSuffix = "_h";
          break;
        default:
          break;
      }
    }
    const iconName = UI.getIconURL(leader.LeaderType, "LEADER") + sizeSuffix + relationshipSuffix + ".png";
    return iconName.toLowerCase();
  }
  Icon2.getLeaderPortraitIcon = getLeaderPortraitIcon;
  function getPlayerBackgroundImage(playerID) {
    const player = Players.get(playerID);
    if (player) {
      const locator = player.civilizationFullName;
      if (locator) {
        const slice1 = locator.slice(17, locator.indexOf("_FULLNAME"));
        if (slice1) {
          const firstchar = slice1.slice(0, 1);
          let slice2 = slice1.slice(1);
          slice2 = slice2.toLowerCase();
          const filename = `blp:${firstchar}${slice2}_HeaderImage`;
          return filename;
        }
      }
    }
    return "blp:Default_HeaderImage";
  }
  Icon2.getPlayerBackgroundImage = getPlayerBackgroundImage;
  function getPlayerLeaderIcon(playerID, size) {
    const playerList = Players.getEverAlive();
    const player = playerList.find((p) => p.id == playerID);
    if (player) {
      return getLeaderPortraitIcon(player.leaderType, size);
    }
    return "blp:TEMP_leader_portrait_confucius";
  }
  Icon2.getPlayerLeaderIcon = getPlayerLeaderIcon;
  function getNotificationIconFromID(notificationID, context = "NOTIFICATION") {
    const notification = Game.Notifications.find(notificationID);
    if (!notification) {
      console.error("Failed attempt to get a notification for notificationID: ", notificationID.toString());
      return "fs://game/base-standard/ui/icons/notifications/default.png";
    }
    const notificationTypeName = Game.Notifications.getTypeName(notification.Type);
    if (!notificationTypeName) {
      console.error("Failed to get the type name for a notification type ID ", notification.Type);
      return "fs://game/base-standard/ui/icons/notifications/default.png";
    }
    let iconURL = UI.getIconURL(notificationTypeName, context);
    if (!iconURL) {
      iconURL = UI.getIconURL("DEFAULT_NOTIFICATION");
    }
    return iconURL;
  }
  Icon2.getNotificationIconFromID = getNotificationIconFromID;
  function getIconFromActionName(actionName, inputDevice, inputContext, hasPrefix) {
    if (!actionName) {
      return null;
    }
    const defInputDevice = inputDevice != void 0 ? inputDevice : InputDeviceType.Controller;
    const actionID = Input.getActionIdByName(actionName);
    if (actionID) {
      return getIconFromActionID(actionID, defInputDevice, inputContext, hasPrefix);
    }
    return null;
  }
  Icon2.getIconFromActionName = getIconFromActionName;
  function getIconFromActionID(actionID, inputDevice, inputContext, hasPrefix) {
    const contextsToTry = [...inputContext ? [inputContext] : [], InputContext.Shell, InputContext.World];
    for (const context of contextsToTry) {
      const actionIconsName = Input.getGestureDisplayIcons(
        actionID,
        0,
        inputDevice,
        context,
        hasPrefix ?? true
      );
      if (actionIconsName[0] && !actionIconsName[0].includes("icon_mapping_unknown")) {
        return actionIconsName[0];
      }
    }
    return null;
  }
  Icon2.getIconFromActionID = getIconFromActionID;
  function getCivSymbolFromCivilizationType(civilization) {
    const civDef = GameInfo.Civilizations.lookup(civilization);
    if (civDef) {
      return UI.getIconURL(civDef.CivilizationType);
    }
    return "";
  }
  Icon2.getCivSymbolFromCivilizationType = getCivSymbolFromCivilizationType;
  function getCivLineFromCivilizationType(civilization) {
    const civDef = GameInfo.Civilizations.lookup(civilization);
    if (civDef) {
      return "blp:civ_line_" + civDef.CivilizationType.slice(13).toLowerCase();
    }
    console.error(`Couldn't look up civ line for civilization ${civilization}`);
    return "";
  }
  Icon2.getCivLineFromCivilizationType = getCivLineFromCivilizationType;
  function getCivSymbolCSSFromCivilizationType(civilization) {
    const url = getCivSymbolFromCivilizationType(civilization);
    return url ? `url('${url}')` : "";
  }
  Icon2.getCivSymbolCSSFromCivilizationType = getCivSymbolCSSFromCivilizationType;
  function getCivLineCSSFromCivilizationType(civilization) {
    const url = getCivLineFromCivilizationType(civilization);
    return url ? `url('${url}')` : "";
  }
  Icon2.getCivLineCSSFromCivilizationType = getCivLineCSSFromCivilizationType;
  function getCivSymbolCSSFromPlayer(playerComponent) {
    const localPlayer = Players.get(playerComponent.owner);
    if (!localPlayer) {
      return "";
    }
    return getCivSymbolCSSFromCivilizationType(localPlayer.civilizationType);
  }
  Icon2.getCivSymbolCSSFromPlayer = getCivSymbolCSSFromPlayer;
  function getCivLineCSSFromPlayer(playerComponent) {
    const localPlayer = Players.get(playerComponent.owner);
    if (!localPlayer) {
      return "";
    }
    return getCivLineCSSFromCivilizationType(localPlayer.civilizationType);
  }
  Icon2.getCivLineCSSFromPlayer = getCivLineCSSFromPlayer;
  function getLegacyPathIcon(legacyPath) {
    switch (legacyPath.LegacyPathClassType) {
      case "LEGACY_PATH_CLASS_MILITARY":
        return UI.getIconURL("VICTORY_CLASS_MILITARY");
      case "LEGACY_PATH_CLASS_CULTURE":
        return UI.getIconURL("VICTORY_CLASS_CULTURE");
      case "LEGACY_PATH_CLASS_ECONOMIC":
        return UI.getIconURL("VICTORY_CLASS_ECONOMIC");
      case "LEGACY_PATH_CLASS_SCIENCE":
        return UI.getIconURL("VICTORY_CLASS_SCIENCE");
    }
    return "";
  }
  Icon2.getLegacyPathIcon = getLegacyPathIcon;
  function getVictoryIcon(victoryDefinition) {
    return UI.getIconURL(victoryDefinition.VictoryClassType);
  }
  Icon2.getVictoryIcon = getVictoryIcon;
  function getTechIconForCivilopedia(techName) {
    if (techName) {
      let newTechName = techName.split("NODE_TECH_").pop()?.substring(3).toLowerCase();
      newTechName = newTechName?.replace("_", "");
      return `url('blp:tech_${newTechName}')`;
    } else {
      return "url('blp:unknown_complete')";
    }
  }
  Icon2.getTechIconForCivilopedia = getTechIconForCivilopedia;
  function getCivicsIconForCivilopedia(civicName) {
    if (civicName) {
      let newCivicName = civicName.split("NODE_CIVIC_").pop()?.substring(3).toLowerCase();
      if (newCivicName) {
        if (newCivicName.startsWith("branch_")) {
          newCivicName = newCivicName.substring(6);
        }
        if (newCivicName.startsWith("main_")) {
          newCivicName = newCivicName.substring(5);
        }
      }
      newCivicName = newCivicName?.replace("_", "");
      return `url('blp:cult_${newCivicName}')`;
    } else {
      return "url('blp:unknown_complete')";
    }
  }
  Icon2.getCivicsIconForCivilopedia = getCivicsIconForCivilopedia;
  function getCivIconForCivilopedia(civName) {
    if (civName) {
      const newCivName = civName.split("CIVILIZATION_").pop()?.toLowerCase();
      return `url('blp:civ_sym_${newCivName}')`;
    } else {
      return "url('blp:unknown_complete')";
    }
  }
  Icon2.getCivIconForCivilopedia = getCivIconForCivilopedia;
  function getCivIconForDiplomacyHeader(civType) {
    const civDef = GameInfo.Civilizations.lookup(civType);
    if (civDef && civDef.StartingCivilizationLevelType === "CIVILIZATION_LEVEL_FULL_CIV") {
      return `blp:dip_cs_${civDef.CivilizationType.slice(13).toLowerCase()}`;
    } else {
      return "blp:dip_cs_citystate";
    }
  }
  Icon2.getCivIconForDiplomacyHeader = getCivIconForDiplomacyHeader;
})(Icon || (Icon = {}));

export { Icon };
//# sourceMappingURL=utilities-image.js.map
