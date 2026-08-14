import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DEFAULT_WORKFLOW_STEPS } from '@/data/workflowDefaults';

// ----------------------------------------------------------------------------
// Workflow CRUD
// ----------------------------------------------------------------------------

export const createWorkflow = async (projectId, steps = DEFAULT_WORKFLOW_STEPS) => {
  try {
    const workflowsRef = collection(db, `projects/${projectId}/dev_workflows`);
    
    // Initialize steps with default values
    const initializedSteps = steps.map(step => ({
      ...step,
      status: 'pending',
      startDate: null,
      endDate: null,
      notes: ''
    }));

    const workflowData = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      steps: initializedSteps
    };

    const docRef = await addDoc(workflowsRef, workflowData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
};

export const getWorkflows = async (projectId) => {
  try {
    const workflowsRef = collection(db, `projects/${projectId}/dev_workflows`);
    const q = query(workflowsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting workflows:', error);
    throw error;
  }
};

export const getWorkflow = async (projectId, workflowId) => {
  try {
    const workflowRef = doc(db, `projects/${projectId}/dev_workflows/${workflowId}`);
    const docSnap = await getDoc(workflowRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw error;
  }
};

export const updateStepStatus = async (projectId, workflowId, stepId, newStatus) => {
  try {
    const workflowRef = doc(db, `projects/${projectId}/dev_workflows/${workflowId}`);
    const docSnap = await getDoc(workflowRef);
    
    if (!docSnap.exists()) throw new Error('Workflow not found');
    
    const workflow = docSnap.data();
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) throw new Error('Step not found');
    
    const step = workflow.steps[stepIndex];
    const oldStatus = step.status;
    
    // Update status and timestamps
    step.status = newStatus;
    if (newStatus === 'in_progress' && !step.startDate) {
      step.startDate = new Date().toISOString(); // Firestore doesn't support serverTimestamp inside arrays directly easily without merge
    } else if (newStatus === 'completed' && !step.endDate) {
      step.endDate = new Date().toISOString();
    }
    
    workflow.steps[stepIndex] = step;
    
    await updateDoc(workflowRef, {
      steps: workflow.steps,
      updatedAt: serverTimestamp()
    });
    
    await logStepChange(projectId, workflowId, stepId, {
      type: 'status_change',
      oldStatus,
      newStatus,
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating step status:', error);
    throw error;
  }
};

export const addStep = async (projectId, workflowId, step) => {
  try {
    const workflowRef = doc(db, `projects/${projectId}/dev_workflows/${workflowId}`);
    const docSnap = await getDoc(workflowRef);
    
    if (!docSnap.exists()) throw new Error('Workflow not found');
    
    const workflow = docSnap.data();
    const newStep = {
      ...step,
      status: 'pending',
      startDate: null,
      endDate: null,
      notes: ''
    };
    
    workflow.steps.push(newStep);
    
    await updateDoc(workflowRef, {
      steps: workflow.steps,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error adding step:', error);
    throw error;
  }
};

export const removeStep = async (projectId, workflowId, stepId) => {
  try {
    const workflowRef = doc(db, `projects/${projectId}/dev_workflows/${workflowId}`);
    const docSnap = await getDoc(workflowRef);
    
    if (!docSnap.exists()) throw new Error('Workflow not found');
    
    const workflow = docSnap.data();
    workflow.steps = workflow.steps.filter(s => s.id !== stepId);
    
    await updateDoc(workflowRef, {
      steps: workflow.steps,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error removing step:', error);
    throw error;
  }
};

export const updateStep = async (projectId, workflowId, stepId, updates) => {
  try {
    const workflowRef = doc(db, `projects/${projectId}/dev_workflows/${workflowId}`);
    const docSnap = await getDoc(workflowRef);
    
    if (!docSnap.exists()) throw new Error('Workflow not found');
    
    const workflow = docSnap.data();
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) throw new Error('Step not found');
    
    workflow.steps[stepIndex] = { ...workflow.steps[stepIndex], ...updates };
    
    await updateDoc(workflowRef, {
      steps: workflow.steps,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating step:', error);
    throw error;
  }
};

export const deleteWorkflow = async (projectId, workflowId) => {
  try {
    const workflowRef = doc(db, `projects/${projectId}/dev_workflows/${workflowId}`);
    await deleteDoc(workflowRef);
    return true;
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// Step History
// ----------------------------------------------------------------------------

export const logStepChange = async (projectId, workflowId, stepId, change) => {
  try {
    const historyRef = collection(db, `projects/${projectId}/dev_workflows/${workflowId}/history`);
    await addDoc(historyRef, {
      stepId,
      ...change,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging step change:', error);
    throw error;
  }
};

export const getStepHistory = async (projectId, workflowId) => {
  try {
    const historyRef = collection(db, `projects/${projectId}/dev_workflows/${workflowId}/history`);
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting step history:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// Professionals
// ----------------------------------------------------------------------------

export const getProfessionals = async (type = null) => {
  try {
    const profRef = collection(db, 'dev_professionals');
    let q = profRef;
    if (type) {
      q = query(profRef, where('type', '==', type));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting professionals:', error);
    throw error;
  }
};

export const addProfessional = async (data) => {
  try {
    const profRef = collection(db, 'dev_professionals');
    const docRef = await addDoc(profRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding professional:', error);
    throw error;
  }
};

export const updateProfessional = async (id, data) => {
  try {
    const profRef = doc(db, `dev_professionals/${id}`);
    await updateDoc(profRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating professional:', error);
    throw error;
  }
};

export const deleteProfessional = async (id) => {
  try {
    const profRef = doc(db, `dev_professionals/${id}`);
    await deleteDoc(profRef);
    return true;
  } catch (error) {
    console.error('Error deleting professional:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// Comments
// ----------------------------------------------------------------------------

export const addDevComment = async (projectId, workflowId, comment) => {
  try {
    const commentsRef = collection(db, `projects/${projectId}/dev_workflows/${workflowId}/comments`);
    const docRef = await addDoc(commentsRef, {
      ...comment,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding dev comment:', error);
    throw error;
  }
};

export const getDevComments = async (projectId, workflowId) => {
  try {
    const commentsRef = collection(db, `projects/${projectId}/dev_workflows/${workflowId}/comments`);
    const q = query(commentsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting dev comments:', error);
    throw error;
  }
};
