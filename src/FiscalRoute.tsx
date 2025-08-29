import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useFiscalData } from './FiscalDataContext';
import { useAuth } from './AuthContext';

interface FiscalRouteProps extends RouteProps {
  component: React.ComponentType<object>;
}

const FiscalRoute: React.FC<FiscalRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuth();
  const { hasFiscalData } = useFiscalData();

  return (
    <Route
      {...rest}
      render={(props) =>
        !isAuthenticated ? (
          <Redirect to="/login" />
        ) : hasFiscalData ? (
          <Component {...props} />
        ) : (
          <Redirect to="/fiscalizacion-lookup" />
        )
      }
    />
  );
};

export default FiscalRoute;
