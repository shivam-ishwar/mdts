import { useEffect, useState } from "react";
import { Select, Input, Form, Row, Col, Button, DatePicker, Modal, Typography, List } from "antd";
import "../styles/register-new-project.css";
import { CloseCircleOutlined, DownloadOutlined, ExclamationCircleOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
// const { Option } = Select;
import { getCurrentUser } from "../Utils/moduleStorage";
import { db } from "../Utils/dataStorege.ts";
import { v4 as uuidv4 } from 'uuid';
interface DocumentData {
  id: any;
  documentName: string;
  files: any[];
  uploadedAt: string;
}

import { useDropzone } from "react-dropzone";
import "../styles/documents.css"
import MapComponent from "./MapComponent.tsx";
import ImageContainer from "../Components/ImageContainer";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
export const RegisterNewProject: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [mineTypeOptions, setMineTypeOptions] = useState<string[]>([]);
  const [allLibrariesName, setAllLibrariesName] = useState<any>([]);
  const initialLibrary = allLibrariesName[0]?.name;
  const [_selectedLibrary, setSelectedLibrary] = useState<any>(initialLibrary);
  const [mineTypePopupOpen, setMineTypePopupOpen] = useState<boolean>(false);
  const [newMineType, setNewMineType] = useState<string>("");
  const [shorthandCode, setShorthandCode] = useState<string>("");
  const [options, setOptions] = useState<string[]>([]);
  // const steps = [
  //   { id: 1, title: "Project Parameters" },
  //   { id: 2, title: "Locations" },
  //   { id: 3, title: "Contractual Details" },
  //   { id: 4, title: "Initial Status" },
  // ];
  const steps = [
    { id: 1, title: "Project Parameters" },
    { id: 2, title: "Locations" },
    { id: 3, title: "Contractual Details" },
    { id: 4, title: "Financial Parameters" },
  ];

  const [formStepsData, setFormStepsData] = useState<any[]>(() => {
    const savedData = localStorage.getItem("projectFormData");
    return savedData ? JSON.parse(savedData) : [];
  });
  const [documentName, setDocumentName] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [_selectedItems, setSelectedItems] = useState(
    allLibrariesName.find((lib: any) => lib.name === initialLibrary)?.items || []
  );
  const [contractualDocuments, setContractualDocuments] = useState<DocumentData[]>([]);
  const [isUploadDisabled, setIsUploadDisabled] = useState(true);
  const [projectTimeline, setProjectTimeline] = useState<any[]>([]);
  const [openBulkImportProjects, setOpenBulkImportProjects] = useState(false);
  const [bulkProjectJson, setBulkProjectJson] = useState("");
  const [bulkProjectResult, setBulkProjectResult] = useState<{ ok: number; skipped: number; failed: number } | null>(null);
  // const requiredFields: { [key: number]: string[] } = {
  //   1: ["companyName", "projectName", "mineral", "typeOfMine", "reserve", "netGeologicalReserve", "extractableReserve", "grade", "stripRatio", "peakCapacity", "mineLife", "totalCoalBlockArea"],
  //   2: ["state", "district", "nearestTown", "nearestAirport", "nearestRailwayStation"],
  //   3: ["mineOwner", "dateOfH1Bidder", "cbdpaDate", "vestingOrderDate", "pbgAmount"],
  //   4: Object.values(allLibrariesName).map((moduleName: any) => moduleName)
  // };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setFormData({});
    clearFormData();
    fetchAllLibrary();
    fetchCompanyName();
  }, []);

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    const project = await db.getProjectById(projectId);
    if (project) {
      setFormStepsData([
        project.projectParameters,
        project.locations,
        project.contractualDetails,
        project.financialParameters || {},
      ]);
      setFormData(project.projectParameters);
    }
  };

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      db.getProjectById(id).then((project) => {
        if (project) {
          const stepsData = [
            project.projectParameters || {},
            project.locations || {},
            project.contractualDetails || {},
            project.financialParameters || {},
          ];
          setFormStepsData(stepsData);
          setFormData(project);
          setProjectTimeline(project.projectTimeline || []);
        }
      });
    }
  }, [id]);


  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const storedOptions: any = (await db.getAllMineTypes())?.filter(
        (type: any) => type.orgId === user.orgId
      );
      setOptions(storedOptions);
    };

    init();
  }, []);

  useEffect(() => {
    setIsUploadDisabled(!(documentName && files.length > 0));
  }, [documentName, files]);

  const fetchMineTypes = async (storedLib: any) => {
    try {
      const currentUser = await getCurrentUser();
      const storedOptions: any = (await db.getAllMineTypes())?.filter(
        (type: any) => type.orgId === currentUser.orgId
      );
      setMineTypeOptions(storedOptions);

      if (storedOptions.length === 1) {
        const defaultMineType = storedOptions[0].type;
        setFormData((prev) => ({ ...prev, typeOfMine: defaultMineType }));

        const updatedLibraries = storedLib.filter((lib: any) => lib.mineType == defaultMineType);
        setAllLibrariesName(storedLib);
        if (updatedLibraries.length > 0) {
          const firstLibrary = updatedLibraries[0];
          setSelectedLibrary(firstLibrary.name);
          setSelectedItems(firstLibrary.items);
        } else {
          setSelectedLibrary(null);
          setSelectedItems([]);
        }
      }
    } catch (error) {
      console.error("Error fetching mine types:", error);
    }
  };

  const fetchAllLibrary = async () => {
    try {
      const storedLibraries: any = await db.getAllLibraries();
      setAllLibrariesName(storedLibraries);
      fetchMineTypes(storedLibraries);
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  }

  const fetchCompanyName = () => {
    const userData = getCurrentUser();
    if (userData) {
      setFormData((prev) => ({ ...prev, companyName: userData.company }));
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormData(formStepsData[currentStep - 2] || {});
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
  };

  const showConfirmationModal = () => {
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleSubmit = async () => {
    const loggedInUser = getCurrentUser();
    const finalData = Array.isArray(formStepsData) ? [...formStepsData] : [];
    finalData[currentStep - 1] = { ...formData };

    const projectPayload = {
      projectParameters: finalData[0] || {},
      locations: finalData[1] || {},
      contractualDetails: finalData[2] || {},
      financialParameters: finalData[3] || {},
      initialStatus: { library: "", items: [] },
      documents: contractualDocuments,
      userGuiId: loggedInUser?.guiId,
      orgId: loggedInUser?.orgId,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isEditMode && id) {
        const existingProject = await db.getProjectById(id);

        if (existingProject) {
          const updatedProject = {
            ...existingProject,
            ...projectPayload,
            updatedAt: new Date().toISOString(),
          };

          await db.updateProject(id, updatedProject);
          notify.success("Project updated successfully");
        }
      }
      else {
        const newProject = {
          ...projectPayload,
          createdAt: new Date().toISOString(),
        };
        await db.addProject(newProject);
        notify.success("Project registered successfully");
      }
      navigate("/create/project-list");
    } catch (error) {
      notify.error("Error saving project");
    }
  };

  const validateFields = (_step: number): boolean => {
    // let newErrors: { [key: string]: string } = {};
    // requiredFields[step].forEach((field) => {
    //   const fieldValue = formData[field];
    //   if (fieldValue === undefined || fieldValue === null || (typeof fieldValue === 'string' && fieldValue.trim() === "") || (typeof fieldValue === 'number' && isNaN(fieldValue))) {
    //     newErrors[field] = "This field is required.";
    //   }
    // });
    // setErrors(newErrors);
    // return Object.keys(newErrors).length === 0;
    return true;
  };

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      loadProjectData(id);
    } else {
      setIsEditMode(false);
      setFormStepsData([]);
      clearFormData();
    }
  }, [id]);

  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  const showDiscardModal = () => setDiscardModalVisible(true);
  const handleDiscardConfirm = () => navigate("/create/project-list");
  const handleDiscardCancel = () => setDiscardModalVisible(false);

  const handleNext = () => {
    if (currentStep < steps.length) {
      if (!validateFields(currentStep)) {
        notify.error("Incomplete Form! Please complete all required fields before proceeding to the next step.")
        return;
      }
      const updatedData = Array.isArray(formStepsData) ? [...formStepsData] : [];
      updatedData[currentStep - 1] = { ...formData };
      setFormStepsData(updatedData);
      setCurrentStep(currentStep + 1);
      setFormData(updatedData[currentStep] || {});
    }
  };

  const clearFormData = () => {
    const userData = getCurrentUser();
    setFormData({
      companyName: userData?.company || "",
      projectName: "",
      reserve: "",
      netGeologicalReserve: "",
      extractableReserve: "",
      stripRatio: "",
      peakCapacity: "",
      mineLife: "",
      totalCoalBlockArea: "",
      mineral: "",
      typeOfMine: "",
      grade: "",
      state: "",
      district: "",
      nearestTown: "",
      nearestAirport: "",
      nearestRailwayStation: "",
      mineOwner: "",
      dateOfH1Bidder: null,
      cbdpaDate: null,
      vestingOrderDate: null,
      pbgAmount: "",
      totalProjectCost: "",
      ebitdaPercentage: "",
      irrPercentage: "",
      npvPercentage: "",
      patPercentage: "",
      patPerTon: "",
      roePercentage: "",
      rocePercentage: "",
      ...(Array.isArray(allLibrariesName) ? allLibrariesName : []).reduce(
        (acc: any, moduleName: any) => {
          if (typeof moduleName === "string") {
            const key = moduleName.replace(/\s+/g, "").toLowerCase();
            acc[key] = undefined;
          }
          return acc;
        },
        {}
      ),
    });
    setErrors({});
  };

  // const handleStatusChange = (index: number, value: string) => {
  //   setSelectedItems((prevItems: any) =>
  //     prevItems.map((item: any, i: any) => {
  //       if (i < index) return item;
  //       if (i === index) return { ...item, status: value === "Yes" ? "Completed" : "Pending" };
  //       return { ...item, status: "Pending" };
  //     })
  //   );
  // };

  // const columns: any = [
  //   {
  //     title: "Module",
  //     dataIndex: "moduleName",
  //     key: "moduleName",
  //     width: "60%",
  //     align: "left",
  //   },
  //   {
  //     title: "Action",
  //     dataIndex: "action",
  //     key: "action",
  //     width: "20%",
  //     align: "center",
  //     render: (_: any, record: any, index: number) => {
  //       const isDisabled = index > 0 && selectedItems[index - 1].status !== "Completed";

  //       return (
  //         <Tooltip title={isDisabled ? "Complete the previous module first" : "Mark as Completed"}>
  //           <Select
  //             value={record.status === "Completed" ? "Yes" : "No"}
  //             style={{ width: "100%" }}
  //             onChange={(value) => handleStatusChange(index, value)}
  //             disabled={isDisabled}
  //           >
  //             <Option value="No">No</Option>
  //             <Option value="Yes">Yes</Option>
  //           </Select>
  //         </Tooltip>
  //       );
  //     },
  //   },
  // ];

  const generateShorthand = (input: string): string => {
    return input
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  const handleAddNewMineType = async () => {
    if (newMineType && shorthandCode) {
      const isDuplicate = options.some(
        (opt: any) =>
          opt.description.trim().toLowerCase() === newMineType.trim().toLowerCase() ||
          opt.type.trim().toLowerCase() === shorthandCode.trim().toLowerCase()
      );

      if (isDuplicate) {
        notify.error("Mine type already exists.");
        return;
      }

      try {
        const mineTypeData: any = {
          type: shorthandCode.trim(),
          description: newMineType.trim(),
          userGuiId: currentUser?.guiId,
          orgId: currentUser?.orgId,
          createdAt: new Date().toISOString(),
          guiId: uuidv4(),
        };

        const id = await db.addMineType(mineTypeData);
        const newOpt = { id, ...mineTypeData };

        setOptions((prev: any[]) => [...prev, newOpt]);
        setMineTypeOptions((prev: any[]) => [
          ...prev,
          { type: newOpt.type, description: newOpt.description },
        ]);

        setFormData((prev) => ({ ...prev, typeOfMine: newOpt.type }));

        const updatedLibraries = (allLibrariesName || []).filter((lib: any) => lib.mineType === newOpt.type);
        if (updatedLibraries.length > 0) {
          setSelectedLibrary(updatedLibraries[0].name);
          setSelectedItems(updatedLibraries[0].items);
        } else {
          setSelectedLibrary(null);
          setSelectedItems([]);
        }

        setNewMineType("");
        setShorthandCode("");
        setMineTypePopupOpen(false);
        notify.success("Added Successfully");
      } catch (error) {
        console.error(error);
        notify.error("Error adding mine type");
      }
    }
  };

  const handleMineTypeChange = (value: string) => {
    setNewMineType(value);
    setShorthandCode(generateShorthand(value));
  };

  const renderStepForm = () => {
    switch (currentStep) {
      case 1:
        return (
          <Form style={{ marginTop: "15px" }} layout="horizontal">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  colon={false}
                  label="Company Name"
                  labelAlign="left"
                  labelCol={{ span: 5 }}
                  wrapperCol={{ span: 19 }}
                  validateStatus={errors.companyName ? "error" : ""}
                  help={errors.companyName ? "Company Name is required" : ""}
                >
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Input
                      type="text"
                      disabled
                      key={formData.companyName} value={formData.companyName || ""}
                      onChange={(e) => handleChange("projectName", e.target.value)}
                    />
                    {/* <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setAddCompanyPopupOpen(true)}
                    /> */}
                  </div>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  colon={false}
                  label="Project Name"
                  labelAlign="left"
                  labelCol={{ span: 5 }}
                  wrapperCol={{ span: 19 }}
                  validateStatus={errors.projectName ? "error" : ""}
                  help={errors.projectName ? "Project Name is required" : ""}
                >
                  <Input
                    type="text"
                    value={formData.projectName || ""}
                    onChange={(e) => handleChange("projectName", e.target.value)}
                  />
                </Form.Item>
              </Col>
              {[
                { label: "Reserve", key: "reserve", type: "number" },
                { label: "Net Geological Reserve", key: "netGeologicalReserve", type: "number" },
                { label: "Extractable Reserve", key: "extractableReserve", type: "number" },
                { label: "Strip Ratio", key: "stripRatio", type: "number" },
                { label: "Peak Capacity", key: "peakCapacity", type: "number" },
                { label: "Mine Life (years)", key: "mineLife", type: "number" },
                { label: "Total Coal Block Area", key: "totalCoalBlockArea", type: "number" },
              ].map(({ label, key, type }, index) => (
                <Col span={12} key={key}>
                  <Form.Item
                    colon={false}
                    label={label}
                    labelAlign="left"
                    labelCol={{ span: 10 }}
                    wrapperCol={{ span: 14 }}
                    validateStatus={errors[key] ? "error" : ""}
                    help={errors[key] ? `${label} is required` : ""}
                  >
                    <Input
                      style={{ marginLeft: index % 2 === 0 ? "4px" : "0", marginRight: index % 2 !== 0 ? "4px" : "0" }}
                      type={type}
                      value={formData[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </Form.Item>
                </Col>
              ))}
              <Col span={12}>
                <Form.Item
                  colon={false}
                  label="Mineral"
                  labelAlign="left"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  validateStatus={errors.mineral ? "error" : ""}
                  help={errors.mineral ? "Mineral is required" : ""}
                >
                  <Select value={formData.mineral || ""} onChange={(value) => handleChange("mineral", value)}>
                    {["Coal", "Iron"].map((option) => (
                      <Select.Option key={option} value={option}>
                        {option}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  colon={false}
                  label="Type of Mine"
                  labelAlign="left"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  validateStatus={errors.typeOfMine ? "error" : ""}
                  help={errors.typeOfMine ? "Type of Mine is required" : ""}
                >
                  <div style={{ display: 'flex', gap: "10px" }}>
                    <Select
                      value={formData.typeOfMine || ""}
                      style={{ marginLeft: "4px" }}
                      disabled={isEditMode && projectTimeline.length > 0}
                      onChange={(value) => {
                        handleChange("typeOfMine", value);
                        const updatedLibraries = allLibrariesName.filter((name: any) => name.mineType === value);
                        setAllLibrariesName(updatedLibraries);
                        if (updatedLibraries.length > 0) {
                          setSelectedLibrary(updatedLibraries[0].name);
                          setSelectedItems(updatedLibraries[0].items);

                        } else {
                          setSelectedLibrary(null);
                        }
                      }}
                    >
                      {mineTypeOptions.map((option: any) => (
                        <Select.Option key={option.type} value={option.type}>
                          {option.type}
                        </Select.Option>
                      ))}
                    </Select>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => setMineTypePopupOpen(true)}></Button>
                  </div>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  colon={false}
                  label="Grade (in case of Coal)"
                  labelAlign="left"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  validateStatus={errors.grade ? "error" : ""}
                  help={errors.grade ? "Grade is required" : ""}
                >
                  <Select allowClear={false} value={formData.grade || ""} onChange={(value) => handleChange("grade", value)}>
                    {["Grade A", "Grade B"].map((option) => (
                      <Select.Option key={option} value={option}>
                        {option}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        );
      case 2:
        return (
          <Form style={{ marginTop: "15px" }} layout="horizontal">
            <Row gutter={[16, 16]}>
              <Col span={24} key="mineLocation">
                <Form.Item
                  colon={false}
                  label="Mine Location"
                  labelAlign="left"
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 18 }}
                  validateStatus={errors["mineLocation"] ? "error" : ""}
                  help={errors["mineLocation"] ? "Mine Location is required" : ""}
                >
                  <Input
                    value={formData["mineLocation"] || ""}
                    onChange={(e) => handleChange("mineLocation", e.target.value)}
                  />
                </Form.Item>
              </Col>

              {[
                { label: "State", key: "state" },
                { label: "District", key: "district" },
                { label: "Nearest Town", key: "nearestTown" },
                { label: "Nearest Airport", key: "nearestAirport" },
                { label: "Nearest Railway Station", key: "nearestRailwayStation" },
              ].map(({ label, key }) => (
                <Col span={24} key={key}>
                  <Form.Item
                    colon={false}
                    label={label}
                    labelAlign="left"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    validateStatus={errors[key] ? "error" : ""}
                    help={errors[key] ? `${label} is required` : ""}
                  >
                    <Input
                      value={formData[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Form>
        );
      case 3:
        return (
          <Form style={{ marginTop: "15px" }} layout="horizontal">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  colon={false}
                  label="Mine Owner"
                  labelAlign="left"
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 18 }}
                  validateStatus={errors.mineOwner ? "error" : ""}
                  help={errors.mineOwner ? "Mine Owner is required" : ""}
                >
                  <Input value={formData.mineOwner || ""} onChange={(e) => handleChange("mineOwner", e.target.value)} />
                </Form.Item>
              </Col>
              {[
                { label: "Date of H1 Bidder", key: "dateOfH1Bidder" },
                { label: "CBDPA Date", key: "cbdpaDate" },
                { label: "Vesting Order Date", key: "vestingOrderDate" },
              ].map(({ label, key }) => (
                <Col span={24} key={key}>
                  <Form.Item
                    colon={false}
                    label={label}
                    labelAlign="left"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    validateStatus={errors[key] ? "error" : ""}
                    help={errors[key] ? `${label} is required` : ""}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      value={toDayjs(formData[key])}
                      onChange={(date) => handleChange(key, date ? date.toISOString() : null)}
                    />

                  </Form.Item>
                </Col>
              ))}
              <Col span={24}>
                <Form.Item
                  colon={false}
                  label="PBG Amount"
                  labelAlign="left"
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 18 }}
                  validateStatus={errors.pbgAmount ? "error" : ""}
                  help={errors.pbgAmount ? "PBG Amount is required" : ""}
                >
                  <Input type="number" value={formData.pbgAmount || ""} onChange={(e) => handleChange("pbgAmount", e.target.value)} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        );
      // case 4:
      //   return (
      //     <div>
      //       <Form className="select-module-group" layout="horizontal">
      //         <Row gutter={[16, 16]}>
      //           <Col span={24}>
      //             <Form.Item
      //               colon={false}
      //               label="Select Group"
      //               labelAlign="left"
      //               labelCol={{ span: 6 }}
      //               wrapperCol={{ span: 18 }}
      //               style={{ fontSize: "18px", fontWeight: "400" }}

      //             >
      //               <Select
      //                 value={selectedLibrary}
      //                 onChange={(value) => {
      //                   setSelectedLibrary(value);
      //                   const filterdLibrary = allLibrariesName.filter((item: any) => item.name == value);
      //                   setSelectedItems(filterdLibrary[0].items)
      //                 }}
      //                 allowClear={true}
      //               >
      //                 {allLibrariesName.map((lib: any) => (
      //                   <Select.Option key={lib.name} value={lib.name}>
      //                     {lib.name}
      //                   </Select.Option>
      //                 ))}
      //               </Select>
      //             </Form.Item>
      //           </Col>
      //         </Row>
      //       </Form>
      //       <Table
      //         columns={columns}
      //         dataSource={selectedItems}
      //         pagination={false}
      //         rowKey="moduleName"
      //         className="project-timeline-table"
      //       />
      //     </div>
      //   );
      // case 4:
      case 4:
        return (
          <Form style={{ marginTop: "15px" }} layout="horizontal">
            <Row gutter={[16, 16]}>
              {[
                { label: "Total Project cost", key: "totalProjectCost" },
                { label: "EBITDA Percentage", key: "ebitdaPercentage" },
                { label: "IRR (%)", key: "irrPercentage" },
                { label: "NPV (%)", key: "npvPercentage" },
                { label: "PAT (%)", key: "patPercentage" },
                { label: "PAT / Ton", key: "patPerTon" },
                { label: "ROE %", key: "roePercentage" },
                { label: "ROCE%", key: "rocePercentage" },
              ].map(({ label, key }) => (
                <Col span={24} key={key}>
                  <Form.Item
                    colon={false}
                    label={label}
                    labelAlign="left"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    validateStatus={errors[key] ? "error" : ""}
                    help={errors[key] ? `${label} is required` : ""}
                  >
                    <Input
                      value={formData[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Form>
        );

      default:
        return null;
    }
  };

  // const toDayjs = (val: any) => {
  //   if (!val) return null;
  //   if (dayjs.isDayjs(val)) return val;
  //   if (val instanceof Date) return dayjs(val);

  //   if (typeof val === "number") {
  //     return dayjs(val > 1e12 ? val : val * 1000);
  //   }

  //   if (typeof val === "string") {
  //     let d = dayjs(val);
  //     if (d.isValid()) return d;

  //     const candidates = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY/MM/DD"];
  //     for (const fmt of candidates) {
  //       d = dayjs(val, fmt, true);
  //       if (d.isValid()) return d;
  //     }

  //     const n = Number(val);
  //     if (!Number.isNaN(n)) return dayjs(n > 1e12 ? n : n * 1000);
  //   }

  //   return null;
  // };

  const toDayjs = (val: any) => {
    if (!val) return null;

    // ✅ true Dayjs instance (has methods)
    if (dayjs.isDayjs(val) && typeof val.isValid === "function") return val;

    // ✅ cloned dayjs object from IndexedDB (prototype lost)
    if (val?.$d) return dayjs(val.$d);

    if (val instanceof Date) return dayjs(val);

    if (typeof val === "number") return dayjs(val > 1e12 ? val : val * 1000);

    if (typeof val === "string") {
      let d = dayjs(val);
      if (d.isValid()) return d;

      const candidates = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY/MM/DD"];
      for (const fmt of candidates) {
        d = dayjs(val, fmt, true);
        if (d.isValid()) return d;
      }

      const n = Number(val);
      if (!Number.isNaN(n)) return dayjs(n > 1e12 ? n : n * 1000);
    }

    return null;
  };

  const onDrop = (acceptedFiles: File[]) => {
    const newFile = acceptedFiles[0];

    setFiles((prevFiles) => {
      const alreadyExists = prevFiles.some((file) => file.name === newFile.name);

      if (alreadyExists) {
        notify.warning("This file has already been selected. Please choose a different file.");
        return prevFiles;
      }

      return [newFile];
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    onDrop,
  });

  const handleSave = () => {
    if (!documentName || files.length === 0) {
      notify.error("Please fill all fields and upload files.");
      return;
    }

    const newDocument: DocumentData = {
      id: uuidv4(),
      documentName,
      files,
      uploadedAt: new Date().toISOString(),
    };

    setContractualDocuments((prev) => [...prev, newDocument]);
    setDocumentName("");
    setFiles([]);

    notify.success("Document has been successfully uploaded.");

  };

  // const handleCancel = () => {
  //   setDocumentName(null);
  //   setFiles([]);
  // };

  const handleRemoveSavedDocument = (id: number) => {
    setContractualDocuments((prev) => prev.filter((doc: any) => doc.id !== id));
  };

  const handleDownloadFile = (file: any) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizeText = (s?: string) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const ensureArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
  const safeJsonParse = (text: string) => {
    const t = (text || "").trim();
    if (!t) return null;
    return JSON.parse(t);
  };

  const toIsoDate = (val: any) => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const d = dayjs(trimmed);
      if (d.isValid()) return d.toISOString();
      const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY/MM/DD"];
      for (const fmt of formats) {
        const parsed = dayjs(trimmed, fmt, true);
        if (parsed.isValid()) return parsed.toISOString();
      }
      return null;
    }
    const d = dayjs(val);
    return d.isValid() ? d.toISOString() : null;
  };

  const sanitizeDocument = (d: any, idx: number): DocumentData => {
    if (typeof d === "string") {
      const name = d.trim() || `Document ${idx + 1}`;
      return {
        id: uuidv4(),
        documentName: name,
        files: [],
        uploadedAt: new Date().toISOString(),
      };
    }

    return {
      id: d?.id ?? uuidv4(),
      documentName: String(d?.documentName ?? d?.name ?? d?.title ?? `Document ${idx + 1}`).trim(),
      files: ensureArray(d?.files),
      uploadedAt: toIsoDate(d?.uploadedAt) || new Date().toISOString(),
    };
  };

  const sanitizeProjectForSave = (raw: any, user: any) => {
    const nowIso = new Date().toISOString();

    const projectParameters = {
      companyName: String(raw?.projectParameters?.companyName ?? raw?.companyName ?? user?.company ?? "").trim(),
      projectName: String(raw?.projectParameters?.projectName ?? raw?.projectName ?? raw?.name ?? "").trim(),
      reserve: String(raw?.projectParameters?.reserve ?? raw?.reserve ?? ""),
      netGeologicalReserve: String(raw?.projectParameters?.netGeologicalReserve ?? raw?.netGeologicalReserve ?? ""),
      extractableReserve: String(raw?.projectParameters?.extractableReserve ?? raw?.extractableReserve ?? ""),
      stripRatio: String(raw?.projectParameters?.stripRatio ?? raw?.stripRatio ?? ""),
      peakCapacity: String(raw?.projectParameters?.peakCapacity ?? raw?.peakCapacity ?? ""),
      mineLife: String(raw?.projectParameters?.mineLife ?? raw?.mineLife ?? ""),
      totalCoalBlockArea: String(raw?.projectParameters?.totalCoalBlockArea ?? raw?.totalCoalBlockArea ?? ""),
      mineral: String(raw?.projectParameters?.mineral ?? raw?.mineral ?? ""),
      typeOfMine: String(raw?.projectParameters?.typeOfMine ?? raw?.typeOfMine ?? ""),
      grade: String(raw?.projectParameters?.grade ?? raw?.grade ?? ""),
    };

    const locations = {
      mineLocation: String(raw?.locations?.mineLocation ?? raw?.mineLocation ?? ""),
      state: String(raw?.locations?.state ?? raw?.state ?? ""),
      district: String(raw?.locations?.district ?? raw?.district ?? ""),
      nearestTown: String(raw?.locations?.nearestTown ?? raw?.nearestTown ?? ""),
      nearestAirport: String(raw?.locations?.nearestAirport ?? raw?.nearestAirport ?? ""),
      nearestRailwayStation: String(raw?.locations?.nearestRailwayStation ?? raw?.nearestRailwayStation ?? ""),
    };

    const contractualDetails = {
      mineOwner: String(raw?.contractualDetails?.mineOwner ?? raw?.mineOwner ?? ""),
      dateOfH1Bidder: toIsoDate(raw?.contractualDetails?.dateOfH1Bidder ?? raw?.dateOfH1Bidder),
      cbdpaDate: toIsoDate(raw?.contractualDetails?.cbdpaDate ?? raw?.cbdpaDate),
      vestingOrderDate: toIsoDate(raw?.contractualDetails?.vestingOrderDate ?? raw?.vestingOrderDate),
      pbgAmount: String(raw?.contractualDetails?.pbgAmount ?? raw?.pbgAmount ?? ""),
    };

    const financialParameters = {
      totalProjectCost: String(raw?.financialParameters?.totalProjectCost ?? raw?.totalProjectCost ?? ""),
      ebitdaPercentage: String(raw?.financialParameters?.ebitdaPercentage ?? raw?.ebitdaPercentage ?? ""),
      irrPercentage: String(raw?.financialParameters?.irrPercentage ?? raw?.irrPercentage ?? ""),
      npvPercentage: String(raw?.financialParameters?.npvPercentage ?? raw?.npvPercentage ?? ""),
      patPercentage: String(raw?.financialParameters?.patPercentage ?? raw?.patPercentage ?? ""),
      patPerTon: String(raw?.financialParameters?.patPerTon ?? raw?.patPerTon ?? ""),
      roePercentage: String(raw?.financialParameters?.roePercentage ?? raw?.roePercentage ?? ""),
      rocePercentage: String(raw?.financialParameters?.rocePercentage ?? raw?.rocePercentage ?? ""),
    };

    return {
      projectParameters,
      locations,
      contractualDetails,
      financialParameters,
      initialStatus: raw?.initialStatus ?? { library: "", items: [] },
      documents: ensureArray(raw?.documents).map((doc: any, idx: number) => sanitizeDocument(doc, idx)),
      userGuiId: raw?.userGuiId ?? user?.guiId,
      orgId: raw?.orgId ?? user?.orgId,
      createdAt: raw?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };
  };

  const isDupProjectForBulk = (project: any, existing: any[]) => {
    const targetName = normalizeText(project?.projectParameters?.projectName);
    if (!targetName) return false;
    return existing.some((x: any) =>
      normalizeText(x?.projectParameters?.projectName) === targetName &&
      String(x?.orgId ?? "") === String(project?.orgId ?? "")
    );
  };

  const handleBulkProjectImport = async () => {
    try {
      if (!currentUser?.orgId) {
        notify.error("User/org not loaded");
        return;
      }

      const parsed = safeJsonParse(bulkProjectJson);
      if (!parsed) {
        notify.error("Paste valid JSON");
        return;
      }

      const rawProjects = ensureArray(parsed);
      const existing = await db.getProjects();
      const scopedExisting = (existing || []).filter((p: any) => String(p?.orgId ?? "") === String(currentUser.orgId));

      let ok = 0;
      let skipped = 0;
      let failed = 0;
      const toInsert: any[] = [];

      for (const raw of rawProjects) {
        try {
          const project = sanitizeProjectForSave(raw, currentUser);
          if (!project?.projectParameters?.projectName) {
            failed += 1;
            continue;
          }
          if (isDupProjectForBulk(project, scopedExisting) || isDupProjectForBulk(project, toInsert)) {
            skipped += 1;
            continue;
          }
          toInsert.push(project);
          ok += 1;
        } catch {
          failed += 1;
        }
      }

      if (!toInsert.length) {
        setBulkProjectResult({ ok: 0, skipped, failed });
        notify.warning("Nothing to import");
        return;
      }

      await db.projects.bulkAdd(toInsert);
      setBulkProjectResult({ ok, skipped, failed });
      notify.success(`Imported ${ok} project(s). Skipped ${skipped}. Failed ${failed}.`);
    } catch (e: any) {
      notify.error(e?.message || "Bulk project import failed");
    }
  };

  return (
    <>
      <div className="registration-container">
        <div className="registration-left">
          <div className="registration-page-heading">
            <p className="page-heading-title">Register New Project</p>
            <span className="pl-subtitle">Create and configure a new project with core parameters</span>
          </div>

          <div className="step-registration-form">
            <div className="form-container-item-div">
              <div className="form-items">
                <div className="progress-bars">
                  <ul>
                    {steps.map((step, index) => (
                      <li
                        key={step.id}
                        className={`step ${currentStep > index + 1
                          ? "completed"
                          : currentStep === index + 1
                            ? "active"
                            : ""
                          }`}
                      >
                        <span className="step-title">{step.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="form-container">
                  <form className="form-container-height">
                    <div className="form-group">{renderStepForm()}</div>
                  </form>
                </div>

                <hr className="saparation-line" />

                <div className="form-buttons">
                  <Button
                    variant="outlined"
                    onClick={handlePrevious}
                    className="bg-tertiary text-white"
                    disabled={currentStep === 1}
                  >
                    Previous
                  </Button>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {!isEditMode && (
                      <Button
                        type="default"
                        icon={<UploadOutlined />}
                        onClick={() => setOpenBulkImportProjects(true)}
                        style={{display:"none"}}
                      >
                        Import JSON
                      </Button>
                    )}

                    {isEditMode && (
                      <Button
                        type="default"
                        danger
                        className="bg-danger text-white"
                        onClick={showDiscardModal}
                      >
                        Discard
                      </Button>
                    )}

                    <Button
                      type="primary"
                      className="bg-secondary text-white"
                      onClick={
                        currentStep === steps.length
                          ? showConfirmationModal
                          : handleNext
                      }
                    >
                      {currentStep === steps.length
                        ? isEditMode
                          ? "Update"
                          : "Submit"
                        : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="registration-right">
          {currentStep === 2 ? (
            <div className="maips-data">
              <MapComponent />
            </div>
          ) : currentStep === 3 ? (
            <div className="image-container">
              <div className="create-doc-heading">
                <div>Attach Document</div>
              </div>

              <div className="contractual-upload-doc-container">
                <div className="contractual-upload-body">
                  <Form.Item
                    label="Contractual File Name"
                    colon={false}
                    required
                  >
                    <Input
                      placeholder="Enter file name"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      allowClear
                    />
                  </Form.Item>

                  <Form.Item
                    label="Upload Files"
                    name="files"
                    rules={[
                      {
                        required: files.length === 0,
                        message: "Please upload at least one file",
                      },
                    ]}
                    colon={false}
                  >
                    <div {...getRootProps()} className="drop-zone">
                      <input {...getInputProps()} />
                      <UploadOutlined />
                      <span>
                        {isDragActive
                          ? "Drop the files here..."
                          : "Drag and drop files here, or click to select files"}
                      </span>
                    </div>

                    {files.length > 0 && (
                      <ul className="file-list">
                        {files.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    )}
                  </Form.Item>

                  {contractualDocuments.length > 0 && (
                    <List
                      dataSource={contractualDocuments}
                      bordered
                      renderItem={(doc) => (
                        <List.Item
                          actions={[
                            <DownloadOutlined
                              onClick={() =>
                                handleDownloadFile(doc.files[0])
                              }
                            />,
                            <CloseCircleOutlined
                              onClick={() =>
                                handleRemoveSavedDocument(doc.id)
                              }
                            />,
                          ]}
                        >
                          <List.Item.Meta
                            title={doc.documentName}
                            description={new Date(
                              doc.uploadedAt
                            ).toLocaleString()}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>

                <div className="action-buttons">
                  <Button
                    disabled={isUploadDisabled}
                    type="primary"
                    className="bg-secondary"
                    onClick={handleSave}
                  >
                    Upload
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="image-container">
              <ImageContainer imageUrl={["/images/auths/m5.jpg", "/images/auths/m5.jpg", "/images/auths/m5.jpg"]} />
            </div>
          )}
        </div>
      </div>


      <Modal
        title="Bulk Import Projects (Paste JSON)"
        open={openBulkImportProjects}
        onCancel={() => setOpenBulkImportProjects(false)}
        onOk={handleBulkProjectImport}
        okText="Import & Save"
        cancelText="Cancel"
        okButtonProps={{ className: "bg-secondary" }}
        cancelButtonProps={{ className: "bg-tertiary" }}
        maskClosable={false}
        keyboard={false}
        width={"70%"}
        className="modal-container"
      >
        <div style={{ padding: "0 6px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Paste an array of projects or a single project object. You can use either nested sections
            (projectParameters, locations, contractualDetails, financialParameters) or flat fields.
          </div>

          <Input.TextArea
            value={bulkProjectJson}
            onChange={(e) => setBulkProjectJson(e.target.value)}
            placeholder={`[
  {
    "projectName": "Ramp-Up Project A",
    "companyName": "Simpro Global",
    "typeOfMine": "OC",
    "mineral": "Coal",
    "grade": "Grade A",
    "state": "Jharkhand",
    "district": "Ranchi",
    "mineOwner": "Simpro Mining Pvt Ltd",
    "dateOfH1Bidder": "2025-01-10",
    "pbgAmount": "5000000",
    "totalProjectCost": "120000000",
    "ebitdaPercentage": "18",
    "irrPercentage": "14",
    "documents": [
      { "documentName": "LoA Document", "uploadedAt": "2025-01-12T10:00:00Z" }
    ]
  }
]`}
            rows={14}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
          />

          {bulkProjectResult && (
            <div style={{ fontSize: 12 }}>
              Imported: <b>{bulkProjectResult.ok}</b> • Skipped (duplicates): <b>{bulkProjectResult.skipped}</b> • Failed: <b>{bulkProjectResult.failed}</b>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={isEditMode ? "Confirm Update" : "Confirm Submission"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleModalCancel}
        okText={isEditMode ? "Update" : "Submit"}
        cancelText="Cancel"
        okButtonProps={{ className: "bg-secondary" }}
        cancelButtonProps={{ className: "bg-tertiary" }}
        maskClosable={false}
        keyboard={false}
        className="modal-container"
      >
        <p className="modal-body-item-padding">
          <ExclamationCircleOutlined style={{ color: "red", marginRight: 8 }} />
          {isEditMode
            ? "Are you sure you want to update this project? Changes will overwrite existing data."
            : "Are you sure you want to submit this form? Submitting will save all data and reset the form."}
        </p>
      </Modal>

      <Modal
        title="Add Mine Type"
        open={mineTypePopupOpen}
        onCancel={() => setMineTypePopupOpen(false)}
        onOk={handleAddNewMineType}
        okButtonProps={{ className: "bg-secondary" }}
        cancelButtonProps={{ className: "bg-tertiary" }}
        maskClosable={false}
        keyboard={false}
        className="modal-container"
      >
        <div className="modal-body-item-padding">
          <Input
            placeholder="Enter Mine Type"
            value={newMineType}
            onChange={(e) => handleMineTypeChange(e.target.value)}
            style={{ marginBottom: "10px" }}
          />

          <Typography>Shorthand Code: <strong>{shorthandCode}</strong></Typography>
        </div>
      </Modal>

      <Modal
        title="Discard Changes"
        open={discardModalVisible}
        onOk={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
        okText="Discard"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        maskClosable={false}
        keyboard={false}
      >
        <p>Are you sure you want to discard this project? All unsaved changes will be lost.</p>
      </Modal>
      <ToastContainer />
    </>
  );
};
