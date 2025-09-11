import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import MesaSelection from './pages/MesaSelection';
import VoteSubmission from './pages/VoteSubmission';
import VoterDetails from './pages/VoterDetails';
import VoterList from './pages/VoterList';
import AddVoter from './pages/AddVoter';
import VoterCount from './pages/VoterCount';
import SelectMesa from './pages/SelectMesa';
import FiscalizacionLookup from './pages/FiscalizacionLookup';
import FiscalizacionActions from './pages/FiscalizacionActions';
import { AuthProvider } from './AuthContext';
import PrivateRoute from './PrivateRoute';
import FiscalRoute from './FiscalRoute';
import { FiscalDataProvider } from './FiscalDataContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <AuthProvider>
        <FiscalDataProvider>
          <IonRouterOutlet>
          <Route exact path="/register">
            <Register />
          </Route>
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/mesas">
            <MesaSelection />
          </Route>
          <Route exact path="/vote">
            <VoteSubmission />
          </Route>
          <Route exact path="/voter">
            <VoterDetails />
          </Route>
          <Route exact path="/home">
            <Home />
          </Route>
          <PrivateRoute exact path="/select-mesa" component={SelectMesa} />
          <FiscalRoute exact path="/voters" component={VoterList} />
          <PrivateRoute exact path="/add-voter" component={AddVoter} />
          <PrivateRoute
            exact
            path="/fiscalizacion-lookup"
            component={FiscalizacionLookup}
          />
          <FiscalRoute
            exact
            path="/fiscalizacion-acciones"
            component={FiscalizacionActions}
          />
          <Route exact path="/voter-count">
            <VoterCount />
          </Route>
          <Route exact path="/">
            <Redirect to="/login" />
          </Route>
        </IonRouterOutlet>
        </FiscalDataProvider>
      </AuthProvider>
    </IonReactRouter>
  </IonApp>
);

export default App;
