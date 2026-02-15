import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, IconButton, Tooltip } from "@mui/material";
import { FilterList } from "@mui/icons-material";
import { Select, Input, Button, Typography, Modal } from "antd";
import { SearchOutlined, DeleteOutlined, RobotOutlined, ExclamationCircleOutlined, ApartmentOutlined, ClusterOutlined, UserOutlined, RetweetOutlined } from "@ant-design/icons";
import "../styles/module-library.css";
import { Link } from "react-router-dom";
import { getCurrentUser } from '../Utils/moduleStorage';
const { Option } = Select;
import { db } from "../Utils/dataStorege.ts";
import { notify } from "../Utils/ToastNotify.tsx";
import { ToastContainer } from "react-toastify";
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs";
interface Activity {
  code: string;
  activityName: string;
  duration: number | string;
  prerequisite: string;
  level: string;
  cost: any;
  notifications: any;
  rasi: any;
}

interface Module {
  parentModuleCode: string;
  moduleName: string;
  level: string;
  id: number;
  mineType: string;
  activities: Activity[];
  duration?: string;
  orgId: string;
  userGuiId: string;
  moduleType: string;
  createdAt: string;
  guiId?: string
}

interface Library {
  name: string;
  mineType: string;
  items: Module[];
  id: any;
  orgId: string;
  userGuiId: string;
  createdAt: string;
  guiId: string;
}

const ModuleLibrary = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const navigate = useNavigate();
  // const [_page, setPage] = useState<number>(0);
  // const _rowsPerPage = 10;
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [newLibraryName, setNewLibraryName] = useState<string>("");
  const [newLibraryMineType, setNewLibraryMineType] = useState<string>("");
  const [newLibraryMineTypeFilter, setNewLibraryMineTypeFilter] = useState<string>("");
  const [libraryType, _setLibraryType] = useState("custom");
  const [modulesData, setModulesData] = useState<Module[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [_selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [mineTypes, setMineTypes] = useState<any>([]);
  const [_moduleTypes, _setModuleTypes] = useState<any>(["Organizational Module", "Personal Module"]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleteModuleModalVisible, setIsDeleteModuleModalVisible] = useState(false);
  const [selectedLibrryId, setSelectedLibraryId] = useState<any>();
  const [selectedModuleId, setSelectedModuleId] = useState<any>();
  const [filteredModules, setFilteredModules] = useState<Module[]>(modulesData);
  const [librarySearchTerm, setLibrarySearchTerm] = useState("");
  const [filteredLibraries, setFilteredLibraries] = useState<Library[]>(libraries);
  const [isConvertModalVisible, setIsConvertModalVisible] = useState(false);
  const [selectedModuleToConvert, setSelectedModuleToConvert] = useState<Module | null>(null);
  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (currentUser) {
      db.getAllLibraries()
        .then((libs) => setLibraries(libs.filter((lib: any) => lib.orgId == currentUser.orgId)))
        .catch((err) => {
          console.error("Error fetching libraries:", err);
          setLibraries([]);
        });

      db.getModules()
        .then((mods) => setModulesData(mods.filter((mod: any) => mod.orgId == currentUser.orgId)))
        .catch((err) => {
          console.error("Error fetching modules:", err);
          setModulesData([]);
        });

      db.getAllMineTypes()
        .then((mine) => setMineTypes(mine.filter((item: any) => item.orgId == currentUser.orgId)))
        .catch((err) => {
          console.error("Error fetching minetypes:", err);
          setModulesData([]);
        });

      db.getProjects()
        .then((projects) => {
          const filteredProjects = (projects || []).filter(
            (proj: any) => proj.orgId == currentUser.orgId
          );

          setAllProjects(filteredProjects);
          setProjects(
            filteredProjects.map((p: any) => p.projectParameters.projectName)
          );
        })
        .catch((err) => {
          console.error("Error fetching projects:", err);
          setAllProjects([]);
          setProjects([]);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    const filtered = modulesData.filter((module) => {
      const searchLower = searchTerm.toLowerCase();
      const typeLabel =
        module.moduleType === "PERSONAL"
          ? "personal module"
          : module.moduleType === "ORG"
            ? "organizational module"
            : "";
      const formattedDate = dayjs(module.createdAt).format("DD MMM YYYY").toLowerCase();

      const searchMatches =
        !searchTerm ||
        module.moduleName.toLowerCase().includes(searchLower) ||
        module.parentModuleCode.toLowerCase().includes(searchLower) ||
        module.mineType.toLowerCase().includes(searchLower) ||
        typeLabel.includes(searchLower) ||
        formattedDate.includes(searchLower);

      const moduleTypeMatches =
        !selectedOption ||
        module.moduleType === selectedOption ||
        (
          selectedOption === "PERSONAL" &&
          module.userGuiId === currentUser?.guiId
        );

      const mineTypeMatches = !newLibraryMineTypeFilter || module.mineType === newLibraryMineTypeFilter;

      return moduleTypeMatches && mineTypeMatches && searchMatches;
    });

    setFilteredModules(filtered);
  }, [searchTerm, selectedOption, newLibraryMineTypeFilter, modulesData]);

  const handleModuleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLibrarySearchTerm(e.target.value);
  };

  const handleMineTypeChange = (value: string) => {
    setNewLibraryMineTypeFilter(value);
  };

  // const handleChangePage = (_: any, newPage: number) => {
  //   setPage(newPage);
  // };

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    const selected: any = allProjects.find((project: any) => project.projectParameters.projectName == value);
    setNewLibraryMineType(selected?.projectParameters.typeOfMine || null);
    setNewLibraryName(value);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, module: Module) => {
    e.dataTransfer.setData("application/json", JSON.stringify(module));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedLibrary) return;
    const data = e.dataTransfer.getData("application/json");
    const moduleData: Module = JSON.parse(data);
    if (moduleData.mineType !== selectedLibrary.mineType) {
      notify.error(
        `Module Mine Type (${moduleData.mineType}) does not match library Mine Type (${selectedLibrary.mineType}).`
      );
      return;
    }
    if (selectedLibrary.items.some((item: any) => item.guiId == moduleData.guiId)) {
      notify.info("Module already exists in this library.");
      return;
    }
    const updatedLibrary = { ...selectedLibrary, items: [...selectedLibrary.items, moduleData] };
    setSelectedLibrary(updatedLibrary);
    setLibraries(prev => prev.map(lib => lib.id == updatedLibrary.id ? updatedLibrary : lib));
  };

  const handleModuleClick = (module: Module) => {
    if (canEditModule(module)) {
      navigate('/modules', { state: module });
    }
  };

  const handleDeleteModule = (modIndex: number) => {
    if (!selectedLibrary) return;
    Modal.confirm({
      title: "Are you sure you want to delete this module?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => {
        const updatedLibrary = {
          ...selectedLibrary,
          items: selectedLibrary.items.filter((_, index) => index !== modIndex),
        };

        setSelectedLibrary(updatedLibrary);
        setLibraries(prev =>
          prev.map(lib => (lib.id == updatedLibrary.id ? updatedLibrary : lib))
        );
        updateLibraryData(updatedLibrary);
      },
    });
  };

  const handleModuleDelete = async () => {
    if (!selectedModuleId) return;
    try {
      await db.deleteModule(selectedModuleId);
      db.getModules()
        .then((mods) => setModulesData(mods.filter((mod: any) => mod.orgId == currentUser.orgId)))
        .catch((err) => {
          console.error("Error fetching modules:", err);
          setModulesData([]);
        });
    } catch (error) {
      notify.error("Error deleting module.");
    }
    setIsDeleteModuleModalVisible(false);
  };

  const handleCreateLibrary = () => {
    if (!newLibraryName.trim() || !newLibraryMineType.trim()) return notify.error("Library name and Mine Type are mandatory.");
    if (!currentUser) return notify.error("User not found.");
    const newLibrary: Library = {
      id: Date.now(),
      guiId: uuidv4(),
      name: newLibraryName,
      mineType: newLibraryMineType,
      items: [],
      userGuiId: currentUser?.guiId,
      orgId: currentUser?.orgId,
      createdAt: new Date().toISOString(),
    };

    setLibraries((prev) => [...prev, newLibrary]);
    setSelectedLibrary(newLibrary);
    handleSaveLibrary(newLibrary);
    setNewLibraryName("");
    setNewLibraryMineType("");
  };

  const updateLibraryData = async (updatedLibrary: Library) => {
    try {
      await db.updateLibrary(updatedLibrary.id, updatedLibrary);
    } catch (error) {
      console.error("Error updating library:", error);
    }
  };

  const handleDeleteLibrary = async () => {
    try {
      await db.deleteLibrary(selectedLibrryId);
      setLibraries((prev) => prev.filter((lib) => lib.id !== selectedLibrryId));
      setIsDeleteModalVisible(false);
      if (selectedLibrary?.id == selectedLibrryId) setSelectedLibrary(null);
    } catch (error) {
      console.error("Error deleting library:", error);
    }
  };

  const handleSaveLibrary = async (library: any) => {
    try {
      const existingLibrary = await db.getLibraryById(library.id ? library.id : selectedLibrary?.id);
      if (existingLibrary) {
        await updateLibraryData(library.id ? library : selectedLibrary);
        notify.success("Library updated successfully!");
      } else {
        await db.addLibrary(library.id ? library : selectedLibrary);
        notify.success("Library created successfully!");
      }
      db.getAllLibraries()
        .then((libs) => setLibraries(libs.filter((lib: any) => lib.orgId == currentUser.orgId)))
        .catch((err) => {
          console.error("Error fetching libraries:", err);
          setLibraries([]);
        });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Error saving library.");
    } finally {
      setSelectedLibrary(library.id ? library : null);
    }
  };

  useEffect(() => {
    const searchLower = librarySearchTerm.toLowerCase();

    const filtered = libraries.filter((lib) => {
      const nameMatch = lib.name.toLowerCase().includes(searchLower);
      const mineMatch = lib.mineType.toLowerCase().includes(searchLower);

      const itemMatch = lib.items?.some(
        (item) =>
          item.moduleName.toLowerCase().includes(searchLower) ||
          item.parentModuleCode.toLowerCase().includes(searchLower)
      );

      return nameMatch || mineMatch || itemMatch;
    });

    setFilteredLibraries(filtered);
  }, [librarySearchTerm, libraries]);

  const renderModuleType = (type: string) => {
    let icon = null;
    let tooltip = "";

    switch (type?.toUpperCase()) {
      case "PERSONAL":
        icon = <UserOutlined style={{ color: "#1890ff" }} />;
        tooltip = "Personal Module";
        break;
      case "ORG":
        icon = <ClusterOutlined style={{ color: "#52c41a" }} />;
        tooltip = "Organization Module";
        break;
      case "MDTS":
        icon = <ApartmentOutlined style={{ color: "#faad14" }} />;
        tooltip = "MDTS Standard Module";
        break;
      default:
        return type;
    }

    return (
      <Tooltip title={tooltip}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
          {icon}
        </span>
      </Tooltip>
    );
  };

  const handleConvertToOrgClick = (e: React.MouseEvent, module: Module) => {
    e.stopPropagation();
    setSelectedModuleToConvert(module);
    setIsConvertModalVisible(true);
  };

  const canEditModule = (module: Module) => {
    return module.moduleType == "PERSONAL" || currentUser?.guiId === module.userGuiId;
  };

  const handleConfirmConvertToOrg = async () => {
    if (!selectedModuleToConvert) return;
    try {
      const updatedCount = await db.modules.update(selectedModuleToConvert.id, {
        ...selectedModuleToConvert,
        moduleType: "ORG",
      });
      if (updatedCount) {
        notify.success("Module successfully converted to Organizational type.");
        db.getModules()
          .then((mods) => setModulesData(mods.filter((mod: any) => mod.orgId == currentUser.orgId)))
          .catch((err) => {
            console.error("Error fetching modules:", err);
            setModulesData([]);
          });
      } else {
        notify.error("Conversion failed. No changes were made.");
      }
    } catch (error) {
      console.error("Error converting module:", error);
      notify.error("Error converting module.");
    } finally {
      setIsConvertModalVisible(false);
      setSelectedModuleToConvert(null);
    }
  };

  return (
    <>
      <div className="page-heading-module-library">
            <p className="page-heading-title">Module Library</p>
            <span className="pl-subtitle">Build reusable module templates for project planning</span>
      </div>

      <div className="headings">
        <div className="heading-one">
          <span>Modules</span>
        </div>
        <div className="heading-two">
          <span>Groups</span>
        </div>
        <div className="heading-three">
          <span>Create Group</span>
        </div>
      </div>

      <Box className="main-section">
        <div className="module-list-page cont-height">
          <Box className="panel-toolbar">
            <Input
              size="small"
              placeholder="Search..."
              onChange={handleModuleSearch}
              prefix={<SearchOutlined />}
              className="toolbar-input"
            />

            <Select
              value={selectedOption || undefined}
              onChange={setSelectedOption}
              allowClear
              size="small"
              placeholder="Select Module Type"
              className="toolbar-select"
            >
              <Option value="MDTS">MDTS Module</Option>
              <Option value="PERSONAL">Personal Module</Option>
              <Option value="ORG">Organizational Module</Option>
            </Select>

            <Select
              size="small"
              placeholder="Mine Type"
              value={newLibraryMineTypeFilter || undefined}
              onChange={handleMineTypeChange}
              allowClear
              className="toolbar-select"
              disabled={libraryType == "project"}
            >
              {mineTypes?.map((type: any) => (
                <Option key={type.type} value={type.type}>
                  {type.type}
                </Option>
              ))}
            </Select>

            <IconButton color="primary" className="toolbar-icon-btn">
              <FilterList />
            </IconButton>
          </Box>

          <div className="panel-divider" />

          <TableContainer component={Paper} className="panel-table-wrap">
            <Table>
              <TableHead className="ml-table-head">
                <TableRow className="ml-table-row-head">
                  <TableCell className="ml-th ml-col-code">Code</TableCell>
                  <TableCell className="ml-th ml-col-name">Name</TableCell>
                  <TableCell className="ml-th ml-col-type">Type</TableCell>
                  <TableCell className="ml-th ml-col-date">Created On</TableCell>
                  <TableCell className="ml-th ml-col-mine">Mine Type</TableCell>
                  <TableCell className="ml-th ml-col-actions">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody className="ml-table-body">
                {modulesData.length > 0 ? (
                  filteredModules.map((module, index) => (
                    <TableRow
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, module)}
                      onClick={() => handleModuleClick(module)}
                      className={`ml-tr ${canEditModule(module) ? "clickable" : ""}`}
                    >
                      <TableCell className="ml-td ml-col-code">{module.parentModuleCode}</TableCell>
                      <TableCell className="ml-td ml-col-name">{module.moduleName}</TableCell>
                      <TableCell className="ml-td ml-col-type">{renderModuleType(module.moduleType)}</TableCell>
                      <TableCell className="ml-td ml-col-date">{dayjs(module.createdAt).format("DD MMM YYYY")}</TableCell>
                      <TableCell className="ml-td ml-col-mine">{module.mineType}</TableCell>

                      <TableCell className="ml-td ml-col-actions ml-actions">
                        {(module.moduleType === "PERSONAL" || module.userGuiId == currentUser.guiId) && (
                          <Button
                            icon={<DeleteOutlined />}
                            type="primary"
                            danger
                            size="small"
                            className="ml-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeleteModuleModalVisible(true);
                              setSelectedModuleId(module.id);
                            }}
                          />
                        )}

                        {module.moduleType === "PERSONAL" && (
                          <Tooltip title="Convert to Organizational Module">
                            <Button
                              icon={<RetweetOutlined />}
                              type="default"
                              size="small"
                              className="ml-action-btn"
                              onClick={(e) => handleConvertToOrgClick(e, module)}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <div className="ml-empty">
                    <div>No Module available. Please add a Module to get started.</div>
                    <div className="ml-empty-cta">
                      <Button type="default" size="small" className="ml-new-btn" icon={<RobotOutlined />}>
                        <Link className="ml-link" to={"/modules"}>
                          New
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                {filteredModules.length === 0 && (
                  <div className="ml-empty muted">No Module found.</div>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <div className="create-library-section cont-height">
          <Box className="panel-toolbar">
            <Input
              size="small"
              placeholder="Search..."
              onChange={handleSearch}
              prefix={<SearchOutlined />}
              className="toolbar-input"
            />
            <IconButton color="primary" className="toolbar-icon-btn">
              <FilterList />
            </IconButton>
          </Box>

          <div className="panel-divider" />

          <div className="panel-scroll">
            {selectedLibrary ? (
              <div className="drop-box" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                <strong className="drop-title">
                  {selectedLibrary.name} ({selectedLibrary.mineType})
                </strong>

                {selectedLibrary.items?.length === 0 ? (
                  <p className="empty-text">Drop modules here</p>
                ) : null}

                {selectedLibrary?.items?.length > 0 &&
                  selectedLibrary.items.map((item, idx) => (
                    <div key={idx} className="drop-item">
                      <span className="drop-item-name">{item.moduleName}</span>

                      <DeleteOutlined
                        onClick={() => handleDeleteModule(idx)}
                        className="delete-icon"
                        title="Remove"
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="drop-box empty">
                <p>Please select a group from the right side or create a new one.</p>
              </div>
            )}
          </div>

          {selectedLibrary && (
            <>
              <div className="panel-divider" />
              <div className="save-row">
                <Button type="primary" className="btn-primary-sm" onClick={handleSaveLibrary}>
                  Save
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="library-details cont-height">
          <Box className="panel-toolbar">
            <Input
              size="small"
              placeholder="Search..."
              onChange={handleSearch}
              prefix={<SearchOutlined />}
              className="toolbar-input"
            />
            <IconButton color="primary" className="toolbar-icon-btn">
              <FilterList />
            </IconButton>
          </Box>

          <div className="panel-divider" />

          <div className="panel-body">
            <div className="group-create-row">
              {libraryType == "project" ? (
                <Select
                  value={newLibraryName || undefined}
                  onChange={handleProjectChange}
                  placeholder="Select Project"
                  className="toolbar-select"
                >
                  {projects.map((project) => (
                    <Option key={project} value={project}>
                      {project}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input
                  size="small"
                  placeholder="Enter Group Name"
                  type="text"
                  value={newLibraryName}
                  onChange={(e) => setNewLibraryName(e.target.value)}
                  className="toolbar-input"
                />
              )}

              <Select
                size="small"
                placeholder="Mine Type"
                value={newLibraryMineType || undefined}
                onChange={(value) => setNewLibraryMineType(value)}
                className="toolbar-select"
                disabled={libraryType == "project"}
              >
                {mineTypes.map((type: any) => (
                  <Option key={type.type} value={type.type}>
                    {type.type}
                  </Option>
                ))}
              </Select>

              <Button type="primary" className="btn-primary-sm" onClick={handleCreateLibrary}>
                Create
              </Button>
            </div>

            <div className="library-list">
              {filteredLibraries.map((library) => (
                <div
                  key={library.id}
                  className={`library-item ${selectedLibrary?.id == library.id ? "selected" : ""}`}
                >
                  <Typography.Text className="library-name" onClick={() => setSelectedLibrary(library)}>
                    {library.name} ({library.mineType})
                  </Typography.Text>

                  <DeleteOutlined
                    onClick={() => {
                      setIsDeleteModalVisible(true);
                      setSelectedLibraryId(library.id);
                    }}
                    className="library-delete"
                    title="Delete group"
                  />
                </div>
              ))}

              {filteredLibraries.length === 0 && (
                <div className="ml-empty muted">No libraries found.</div>
              )}
            </div>
          </div>
        </div>
      </Box>

      <Modal
        title="Confirm Delete"
        visible={isDeleteModalVisible}
        onOk={handleDeleteLibrary}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="Delete"
        cancelText="Cancel"
        okType="danger"
        width={"45%"}
        className="modal-container"
        centered
      >
        <div style={{ padding: "0px 10px" }}>
          <p>
            <ExclamationCircleOutlined style={{ color: "red", marginRight: "8px" }} />
            Are you sure you want to Remove this library? This action cannot be undone.
          </p>
        </div>
      </Modal >

      <Modal
        title="Confirm Delete"
        visible={isDeleteModuleModalVisible}
        onOk={handleModuleDelete}
        onCancel={() => setIsDeleteModuleModalVisible(false)}
        okText="Delete"
        cancelText="Cancel"
        okType="danger"
        width={"45%"}
        className="modal-container"
        centered
      >
        <div style={{ padding: "0px 10px" }}>
          <p>
            <ExclamationCircleOutlined style={{ color: "red", marginRight: "8px" }} />
            Are you sure you want to Remove this module? This action cannot be undone.
          </p>
        </div>
      </Modal >

      <Modal
        title="Convert to Organizational Module"
        visible={isConvertModalVisible}
        onOk={handleConfirmConvertToOrg}
        onCancel={() => setIsConvertModalVisible(false)}
        okText="Convert"
        cancelText="Cancel"
        okType="primary"
        width="45%"
        className="modal-container"
        centered
      >
        <div style={{ padding: "0px 10px" }}>
          <p>
            <ExclamationCircleOutlined style={{ color: "#faad14", marginRight: "8px" }} />
            Are you sure you want to convert this module to an Organizational Module?
          </p>
        </div>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default ModuleLibrary;
